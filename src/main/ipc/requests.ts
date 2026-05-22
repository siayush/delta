import { requestsRepo } from '../db/repositories/requests'
import { IpcChannel } from '@shared/ipc'
import { registerHandler } from './registry'

export function registerRequestsIpc(): void {
  registerHandler(IpcChannel.RequestsList, () => requestsRepo.list())
  registerHandler(IpcChannel.RequestsCreate, (_evt, input) => requestsRepo.create(input))
  registerHandler(IpcChannel.RequestsUpdate, (_evt, id, patch) => requestsRepo.update(id, patch))
  registerHandler(IpcChannel.RequestsDelete, (_evt, id) => {
    requestsRepo.delete(id)
  })
}
