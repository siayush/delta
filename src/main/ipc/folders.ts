import { foldersRepo } from '../db/repositories/folders'
import { IpcChannel } from '@shared/ipc'
import { registerHandler } from './registry'

export function registerFoldersIpc(): void {
  registerHandler(IpcChannel.FoldersList, () => foldersRepo.list())
  registerHandler(IpcChannel.FoldersCreate, (_evt, name) => foldersRepo.create(name))
  registerHandler(IpcChannel.FoldersDelete, (_evt, id) => {
    foldersRepo.delete(id)
  })
}
