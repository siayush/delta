import { net } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { ApiResponse, SendRequestInput } from '@shared/types'
import { registerHandler } from './registry'
import { ipcLogger } from '../logger'

// Tracks in-flight requests keyed by the renderer-supplied requestId so
// http:cancel can abort them. Entries are removed when the request settles
// (response, error, timeout, abort).
const inFlight = new Map<string, Electron.ClientRequest>()

function buildUrl(url: string, queryParams: Record<string, string>): string {
  if (!url) throw new Error('URL is required')
  const entries = Object.entries(queryParams).filter(([k]) => k.trim() !== '')
  if (entries.length === 0) return url
  const sep = url.includes('?') ? '&' : '?'
  const qs = new URLSearchParams(entries).toString()
  return `${url}${sep}${qs}`
}

function parseHeaders(headersIn: Record<string, string | string[]>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headersIn)) {
    out[k] = Array.isArray(v) ? v.join(', ') : v
  }
  return out
}

async function readBody(response: Electron.IncomingMessage): Promise<{ raw: string; size: number }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    response.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      size += chunk.length
    })
    response.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      resolve({ raw, size })
    })
    response.on('error', reject)
  })
}

function tryJson(raw: string): unknown {
  if (!raw) return ''
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function sendRequest(input: SendRequestInput): Promise<ApiResponse> {
  const started = performance.now()
  const finalUrl = buildUrl(input.url, input.queryParams)

  return new Promise<ApiResponse>((resolve, reject) => {
    const req = net.request({
      method: input.method,
      url: finalUrl,
      redirect: 'follow'
    })

    if (input.requestId) inFlight.set(input.requestId, req)
    const cleanup = (): void => {
      if (input.requestId) inFlight.delete(input.requestId)
    }

    for (const [key, value] of Object.entries(input.headers)) {
      if (!key.trim()) continue
      try {
        req.setHeader(key, value)
      } catch (e) {
        ipcLogger.warn(`Skipping invalid header ${key}:`, e)
      }
    }

    const timeoutMs = input.timeoutMs ?? 30_000
    const timer = setTimeout(() => {
      req.abort()
      cleanup()
      reject(new Error(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    req.on('response', async (response) => {
      try {
        const { raw, size } = await readBody(response)
        clearTimeout(timer)
        cleanup()
        resolve({
          status: response.statusCode,
          statusText: response.statusMessage,
          headers: parseHeaders(response.headers),
          data: tryJson(raw),
          responseTime: Math.round(performance.now() - started),
          size
        })
      } catch (e) {
        clearTimeout(timer)
        cleanup()
        reject(e)
      }
    })

    req.on('abort', () => {
      clearTimeout(timer)
      cleanup()
      reject(new Error('Request cancelled'))
    })

    req.on('error', (err) => {
      clearTimeout(timer)
      cleanup()
      reject(err)
    })

    if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
      req.write(input.body, 'utf-8')
    }
    req.end()
  })
}

export function registerHttpIpc(): void {
  registerHandler(IpcChannel.HttpSend, (_evt, input) => sendRequest(input))
  registerHandler(IpcChannel.HttpCancel, (_evt, requestId) => {
    const req = inFlight.get(requestId)
    if (!req) return false
    req.abort()
    return true
  })
}
