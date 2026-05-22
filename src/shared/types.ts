export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface ApiRequest {
  id: string
  name: string
  method: HttpMethod
  url: string
  headers: Record<string, string>
  queryParams: Record<string, string>
  body: string
  folderId?: string | null
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: unknown
  responseTime: number
  size: number
}

export interface Snapshot {
  id: string
  requestId: string
  environmentId?: string | null
  label?: string | null
  isBaseline: boolean
  response: ApiResponse
  createdAt: number
}

export interface Environment {
  id: string
  name: string
  baseUrl: string
  color: string
  variables: Record<string, string>
  createdAt: number
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface SendRequestInput {
  method: HttpMethod
  url: string
  headers: Record<string, string>
  queryParams: Record<string, string>
  body: string
  timeoutMs?: number
}
