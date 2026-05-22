import { snapshotsRepo } from '../db/repositories/snapshots'
import { IpcChannel } from '@shared/ipc'
import type { Snapshot } from '@shared/types'
import { registerHandler } from './registry'

export function registerSnapshotsIpc(): void {
  registerHandler(IpcChannel.SnapshotsList, (_evt, requestId) =>
    snapshotsRepo.listForRequest(requestId as string)
  )
  registerHandler(IpcChannel.SnapshotsCreate, (_evt, input) =>
    snapshotsRepo.create(input as Omit<Snapshot, 'id' | 'createdAt'>)
  )
  registerHandler(IpcChannel.SnapshotsDelete, (_evt, id) => {
    snapshotsRepo.delete(id as string)
  })
  registerHandler(IpcChannel.SnapshotsSetBaseline, (_evt, id) =>
    snapshotsRepo.setBaseline(id as string)
  )
}
