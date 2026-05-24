import { IpcChannel } from '@shared/ipc'
import type { HttpMethod, KvEntry, ParsedCurl, RequestAuth } from '@shared/types'
import { DEFAULT_REQUEST_AUTH } from '@shared/schemas'
import { registerHandler } from './registry'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function registerCurlIpc(): void {
  registerHandler(IpcChannel.AppParseCurl, async (_event, curl) => parseCurl(curl))
}

interface CurlJsonOutput {
  url: string
  method: string
  headers?: Record<string, string | null>
  queries?: Record<string, string | string[]>
  data?: unknown
  auth?: { user: string; password: string }
  auth_type?: string
}

async function parseCurl(curl: string): Promise<ParsedCurl> {
  const trimmed = curl.trim()
  if (!trimmed) throw new Error('Empty cURL command.')
  const { toJsonObject } = await import('curlconverter')
  const raw = toJsonObject(trimmed) as CurlJsonOutput
  const method = normalizeMethod(raw.method)
  const headers: KvEntry[] = []
  for (const [k, v] of Object.entries(raw.headers ?? {})) {
    if (v == null) continue
    headers.push({ key: k, value: String(v), enabled: true })
  }
  const queryParams: KvEntry[] = []
  for (const [k, v] of Object.entries(raw.queries ?? {})) {
    queryParams.push({
      key: k,
      value: Array.isArray(v) ? v.join(',') : String(v),
      enabled: true
    })
  }
  const auth = extractAuth(headers, raw)
  return {
    name: deriveName(raw.url, method),
    method,
    url: raw.url,
    headers,
    queryParams,
    body: serializeBody(raw.data),
    auth
  }
}

// Pull Authorization out of headers and surface it via the request's auth
// field so the editor's Auth tab can render it. The matching header is
// removed from the list so it doesn't appear twice on send.
function extractAuth(headers: KvEntry[], raw: CurlJsonOutput): RequestAuth {
  if (raw.auth && raw.auth_type !== 'bearer') {
    return { type: 'basic', token: '', username: raw.auth.user, password: raw.auth.password }
  }
  const idx = headers.findIndex((h) => h.key.toLowerCase() === 'authorization')
  if (idx < 0) return DEFAULT_REQUEST_AUTH
  const value = headers[idx].value
  const bearer = /^Bearer\s+(.+)$/i.exec(value)
  if (bearer) {
    headers.splice(idx, 1)
    return { type: 'bearer', token: bearer[1].trim(), username: '', password: '' }
  }
  const basic = /^Basic\s+(.+)$/i.exec(value)
  if (basic) {
    headers.splice(idx, 1)
    const decoded = safeBase64Decode(basic[1].trim())
    const sep = decoded.indexOf(':')
    if (sep >= 0) {
      return {
        type: 'basic',
        token: '',
        username: decoded.slice(0, sep),
        password: decoded.slice(sep + 1)
      }
    }
  }
  return DEFAULT_REQUEST_AUTH
}

function safeBase64Decode(s: string): string {
  try {
    return Buffer.from(s, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function normalizeMethod(m: string | undefined): HttpMethod {
  const upper = (m ?? 'GET').toUpperCase() as HttpMethod
  return HTTP_METHODS.includes(upper) ? upper : 'GET'
}

function serializeBody(data: unknown): string {
  if (data == null) return ''
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function deriveName(url: string, method: HttpMethod): string {
  try {
    const { pathname, hostname } = new URL(url)
    const path = pathname && pathname !== '/' ? pathname : hostname
    return `${method} ${path}`
  } catch {
    return `${method} Request`
  }
}
