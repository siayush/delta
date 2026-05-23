import type { z } from 'zod'
import type {
  ApiRequestSchema,
  ApiResponseSchema,
  EnvironmentSchema,
  FolderSchema,
  HttpMethodSchema,
  KvEntrySchema,
  RequestAuthSchema,
  RequestAuthTypeSchema,
  SendRequestInputSchema,
  SnapshotSchema
} from './schemas'

export type HttpMethod = z.infer<typeof HttpMethodSchema>
export type ApiRequest = z.infer<typeof ApiRequestSchema>
export type Folder = z.infer<typeof FolderSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type Snapshot = z.infer<typeof SnapshotSchema>
export type Environment = z.infer<typeof EnvironmentSchema>
export type SendRequestInput = z.infer<typeof SendRequestInputSchema>
export type RequestAuth = z.infer<typeof RequestAuthSchema>
export type RequestAuthType = z.infer<typeof RequestAuthTypeSchema>
export type KvEntry = z.infer<typeof KvEntrySchema>

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface ParsedCurl {
  name: string
  method: HttpMethod
  url: string
  headers: KvEntry[]
  queryParams: KvEntry[]
  body: string
  auth: RequestAuth
}
