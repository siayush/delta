import { z } from 'zod'

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

const StringRecord = z.record(z.string(), z.string())

export const KvEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean()
})
export const KvEntryListSchema = z.array(KvEntrySchema)

export const RequestAuthTypeSchema = z.enum(['none', 'bearer', 'basic'])

export const RequestAuthSchema = z.object({
  type: RequestAuthTypeSchema,
  token: z.string().default(''),
  username: z.string().default(''),
  password: z.string().default('')
})

export const DEFAULT_REQUEST_AUTH = {
  type: 'none' as const,
  token: '',
  username: '',
  password: ''
}

export const ApiRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: HttpMethodSchema,
  url: z.string(),
  headers: KvEntryListSchema,
  queryParams: KvEntryListSchema,
  body: z.string(),
  auth: RequestAuthSchema,
  folderId: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const ApiRequestCreateInputSchema = ApiRequestSchema.partial().extend({
  name: z.string(),
  method: HttpMethodSchema
})

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number()
})

export const ApiResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: StringRecord,
  data: z.unknown(),
  responseTime: z.number(),
  size: z.number()
})

export const SnapshotSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  environmentId: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  isBaseline: z.boolean(),
  response: ApiResponseSchema,
  createdAt: z.number()
})

export const SnapshotCreateInputSchema = SnapshotSchema.omit({ id: true, createdAt: true })

export const EnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  color: z.string(),
  variables: StringRecord,
  createdAt: z.number()
})

export const EnvironmentCreateInputSchema = EnvironmentSchema.omit({ id: true, createdAt: true })

export const SendRequestInputSchema = z.object({
  method: HttpMethodSchema,
  url: z.string(),
  headers: StringRecord,
  queryParams: StringRecord,
  body: z.string(),
  timeoutMs: z.number().optional(),
  // Renderer-generated correlation ID. When present, main tracks the
  // in-flight request so it can be aborted via http:cancel.
  requestId: z.string().optional()
})

export const UpdaterEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('checking') }),
  z.object({ type: z.literal('available'), version: z.string() }),
  z.object({ type: z.literal('not-available') }),
  z.object({ type: z.literal('downloading'), percent: z.number() }),
  z.object({ type: z.literal('downloaded'), version: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() })
])
