import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/ipc'
import type { UpdaterEvent } from '../shared/ipc'
import type {
  ApiRequest,
  Environment,
  Folder,
  HttpMethod,
  ParsedCurl,
  SendRequestInput,
  Snapshot
} from '../shared/types'

/**
 * Typed surface exposed to the renderer. Each call serializes through
 * Electron's contextBridge — no Node or Electron internals leak.
 */
const api = {
  requests: {
    list: (): Promise<ApiRequest[]> => ipcRenderer.invoke(IpcChannel.RequestsList),
    create: (
      input: Partial<ApiRequest> & { name: string; method: HttpMethod }
    ): Promise<ApiRequest> => ipcRenderer.invoke(IpcChannel.RequestsCreate, input),
    update: (id: string, patch: Partial<ApiRequest>): Promise<ApiRequest> =>
      ipcRenderer.invoke(IpcChannel.RequestsUpdate, id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.RequestsDelete, id)
  },
  folders: {
    list: (): Promise<Folder[]> => ipcRenderer.invoke(IpcChannel.FoldersList),
    create: (name: string): Promise<Folder> => ipcRenderer.invoke(IpcChannel.FoldersCreate, name),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.FoldersDelete, id)
  },
  snapshots: {
    list: (requestId: string): Promise<Snapshot[]> =>
      ipcRenderer.invoke(IpcChannel.SnapshotsList, requestId),
    create: (input: Omit<Snapshot, 'id' | 'createdAt'>): Promise<Snapshot> =>
      ipcRenderer.invoke(IpcChannel.SnapshotsCreate, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.SnapshotsDelete, id),
    setBaseline: (id: string): Promise<Snapshot> =>
      ipcRenderer.invoke(IpcChannel.SnapshotsSetBaseline, id),
    rename: (id: string, label: string | null): Promise<Snapshot> =>
      ipcRenderer.invoke(IpcChannel.SnapshotsRename, id, label)
  },
  environments: {
    list: (): Promise<Environment[]> => ipcRenderer.invoke(IpcChannel.EnvironmentsList),
    create: (input: Omit<Environment, 'id' | 'createdAt'>): Promise<Environment> =>
      ipcRenderer.invoke(IpcChannel.EnvironmentsCreate, input),
    update: (id: string, patch: Partial<Environment>): Promise<Environment> =>
      ipcRenderer.invoke(IpcChannel.EnvironmentsUpdate, id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.EnvironmentsDelete, id)
  },
  http: {
    send: (input: SendRequestInput) => ipcRenderer.invoke(IpcChannel.HttpSend, input),
    cancel: (requestId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.HttpCancel, requestId)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannel.AppGetVersion),
    openLogs: (): Promise<void> => ipcRenderer.invoke(IpcChannel.AppOpenLogs),
    parseCurl: (curl: string): Promise<ParsedCurl> =>
      ipcRenderer.invoke(IpcChannel.AppParseCurl, curl)
  },
  updater: {
    check: (): Promise<void> => ipcRenderer.invoke(IpcChannel.UpdaterCheck),
    onEvent: (cb: (event: UpdaterEvent) => void): (() => void) => {
      const listener = (_e: unknown, payload: UpdaterEvent): void => cb(payload)
      ipcRenderer.on(IpcChannel.UpdaterEvent, listener)
      return () => ipcRenderer.off(IpcChannel.UpdaterEvent, listener)
    }
  }
} as const

export type DeltaApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('delta', api)
  } catch (error) {
    console.error('[preload] failed to expose API:', error)
  }
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).delta = api
}
