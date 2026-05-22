import { snapshotsRepo } from '../db/repositories/snapshots'
import { IpcChannel } from '@shared/ipc'
import { registerHandler } from './registry'

export function registerSnapshotsIpc(): void {
  registerHandler(IpcChannel.SnapshotsList, (_evt, requestId) =>
    snapshotsRepo.listForRequest(requestId)
  )
  registerHandler(IpcChannel.SnapshotsCreate, (_evt, input) => snapshotsRepo.create(input))
  registerHandler(IpcChannel.SnapshotsDelete, (_evt, id) => {
    snapshotsRepo.delete(id)
  })
  registerHandler(IpcChannel.SnapshotsSetBaseline, (_evt, id) => snapshotsRepo.setBaseline(id))
}
