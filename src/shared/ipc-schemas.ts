import { z } from 'zod'
import { IpcChannel } from './ipc'
import {
  ApiRequestCreateInputSchema,
  ApiRequestSchema,
  ApiResponseSchema,
  EnvironmentCreateInputSchema,
  EnvironmentSchema,
  FolderSchema,
  HttpMethodSchema,
  KvEntryListSchema,
  RequestAuthSchema,
  SendRequestInputSchema,
  SnapshotCreateInputSchema,
  SnapshotSchema
} from './schemas'

const ParsedCurlSchema = z.object({
  name: z.string(),
  method: HttpMethodSchema,
  url: z.string(),
  headers: KvEntryListSchema,
  queryParams: KvEntryListSchema,
  body: z.string(),
  auth: RequestAuthSchema
})

const Empty = z.tuple([])

/**
 * Per-channel argument and result schemas. Validated by the main-process IPC
 * registry on every invoke — args are decoded inbound, results are parsed
 * outbound. Any drift between renderer call sites and main handlers fails
 * loudly here rather than silently corrupting state.
 */
export const ipcSchemas = {
  [IpcChannel.RequestsList]: {
    args: Empty,
    result: z.array(ApiRequestSchema)
  },
  [IpcChannel.RequestsCreate]: {
    args: z.tuple([ApiRequestCreateInputSchema]),
    result: ApiRequestSchema
  },
  [IpcChannel.RequestsUpdate]: {
    args: z.tuple([z.string(), ApiRequestSchema.partial()]),
    result: ApiRequestSchema
  },
  [IpcChannel.RequestsDelete]: {
    args: z.tuple([z.string()]),
    result: z.void()
  },

  [IpcChannel.FoldersList]: {
    args: Empty,
    result: z.array(FolderSchema)
  },
  [IpcChannel.FoldersCreate]: {
    args: z.tuple([z.string()]),
    result: FolderSchema
  },
  [IpcChannel.FoldersDelete]: {
    args: z.tuple([z.string()]),
    result: z.void()
  },

  [IpcChannel.SnapshotsList]: {
    args: z.tuple([z.string()]),
    result: z.array(SnapshotSchema)
  },
  [IpcChannel.SnapshotsCreate]: {
    args: z.tuple([SnapshotCreateInputSchema]),
    result: SnapshotSchema
  },
  [IpcChannel.SnapshotsDelete]: {
    args: z.tuple([z.string()]),
    result: z.void()
  },
  [IpcChannel.SnapshotsSetBaseline]: {
    args: z.tuple([z.string()]),
    result: SnapshotSchema
  },
  [IpcChannel.SnapshotsRename]: {
    args: z.tuple([z.string(), z.string().nullable()]),
    result: SnapshotSchema
  },

  [IpcChannel.EnvironmentsList]: {
    args: Empty,
    result: z.array(EnvironmentSchema)
  },
  [IpcChannel.EnvironmentsCreate]: {
    args: z.tuple([EnvironmentCreateInputSchema]),
    result: EnvironmentSchema
  },
  [IpcChannel.EnvironmentsUpdate]: {
    args: z.tuple([z.string(), EnvironmentSchema.partial()]),
    result: EnvironmentSchema
  },
  [IpcChannel.EnvironmentsDelete]: {
    args: z.tuple([z.string()]),
    result: z.void()
  },

  [IpcChannel.HttpSend]: {
    args: z.tuple([SendRequestInputSchema]),
    result: ApiResponseSchema
  },
  [IpcChannel.HttpCancel]: {
    args: z.tuple([z.string()]),
    result: z.boolean()
  },

  [IpcChannel.AppGetVersion]: {
    args: Empty,
    result: z.string()
  },
  [IpcChannel.AppOpenLogs]: {
    args: Empty,
    result: z.void()
  },
  [IpcChannel.AppParseCurl]: {
    args: z.tuple([z.string()]),
    result: ParsedCurlSchema
  },

  [IpcChannel.UpdaterCheck]: {
    args: Empty,
    result: z.void()
  }
} as const

export type IpcSchemas = typeof ipcSchemas
export type IpcSchemaChannel = keyof IpcSchemas

export type IpcArgs<C extends IpcSchemaChannel> = z.infer<IpcSchemas[C]['args']>
export type IpcResult<C extends IpcSchemaChannel> = z.infer<IpcSchemas[C]['result']>
