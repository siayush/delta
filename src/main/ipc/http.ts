import { net } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { ApiResponse, SendRequestInput } from '@shared/types'
import { registerHandler } from './registry'
import { ipcLogger } from '../logger'

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
      reject(new Error(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    req.on('response', async (response) => {
      try {
        const { raw, size } = await readBody(response)
        clearTimeout(timer)
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
        reject(e)
      }
    })

    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
      req.write(input.body, 'utf-8')
    }
    req.end()
  })
}

export function registerHttpIpc(): void {
  registerHandler(IpcChannel.HttpSend, (_evt, input) => sendRequest(input as SendRequestInput))
}
