import type {
  ApiRequest,
  ApiResponse,
  Environment,
  Folder,
  ParsedCurl,
  SendRequestInput,
  Snapshot
} from './types'

export const IpcChannel = {
  RequestsList: 'requests:list',
  RequestsCreate: 'requests:create',
  RequestsUpdate: 'requests:update',
  RequestsDelete: 'requests:delete',

  FoldersList: 'folders:list',
  FoldersCreate: 'folders:create',
  FoldersDelete: 'folders:delete',

  SnapshotsList: 'snapshots:list',
  SnapshotsCreate: 'snapshots:create',
  SnapshotsDelete: 'snapshots:delete',
  SnapshotsSetBaseline: 'snapshots:setBaseline',
  SnapshotsRename: 'snapshots:rename',

  EnvironmentsList: 'environments:list',
  EnvironmentsCreate: 'environments:create',
  EnvironmentsUpdate: 'environments:update',
  EnvironmentsDelete: 'environments:delete',

  HttpSend: 'http:send',
  HttpCancel: 'http:cancel',

  AppGetVersion: 'app:getVersion',
  AppOpenLogs: 'app:openLogs',
  AppParseCurl: 'app:parseCurl',

  UpdaterCheck: 'updater:check',
  UpdaterEvent: 'updater:event'
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

export interface IpcContract {
  [IpcChannel.RequestsList]: { args: []; result: ApiRequest[] }
  [IpcChannel.RequestsCreate]: {
    args: [Partial<ApiRequest> & { name: string; method: ApiRequest['method'] }]
    result: ApiRequest
  }
  [IpcChannel.RequestsUpdate]: { args: [string, Partial<ApiRequest>]; result: ApiRequest }
  [IpcChannel.RequestsDelete]: { args: [string]; result: void }

  [IpcChannel.FoldersList]: { args: []; result: Folder[] }
  [IpcChannel.FoldersCreate]: { args: [string]; result: Folder }
  [IpcChannel.FoldersDelete]: { args: [string]; result: void }

  [IpcChannel.SnapshotsList]: { args: [string]; result: Snapshot[] }
  [IpcChannel.SnapshotsCreate]: {
    args: [Omit<Snapshot, 'id' | 'createdAt'>]
    result: Snapshot
  }
  [IpcChannel.SnapshotsDelete]: { args: [string]; result: void }
  [IpcChannel.SnapshotsSetBaseline]: { args: [string]; result: Snapshot }
  [IpcChannel.SnapshotsRename]: { args: [string, string | null]; result: Snapshot }

  [IpcChannel.EnvironmentsList]: { args: []; result: Environment[] }
  [IpcChannel.EnvironmentsCreate]: {
    args: [Omit<Environment, 'id' | 'createdAt'>]
    result: Environment
  }
  [IpcChannel.EnvironmentsUpdate]: {
    args: [string, Partial<Environment>]
    result: Environment
  }
  [IpcChannel.EnvironmentsDelete]: { args: [string]; result: void }

  [IpcChannel.HttpSend]: { args: [SendRequestInput]; result: ApiResponse }

  [IpcChannel.AppGetVersion]: { args: []; result: string }
  [IpcChannel.AppOpenLogs]: { args: []; result: void }
  [IpcChannel.AppParseCurl]: { args: [string]; result: ParsedCurl }

  [IpcChannel.UpdaterCheck]: { args: []; result: void }
}

export type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }
