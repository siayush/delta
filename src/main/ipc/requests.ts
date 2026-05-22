import { requestsRepo } from '../db/repositories/requests'
import { IpcChannel } from '@shared/ipc'
import type { ApiRequest, HttpMethod } from '@shared/types'
import { registerHandler } from './registry'

export function registerRequestsIpc(): void {
  registerHandler(IpcChannel.RequestsList, () => requestsRepo.list())

  registerHandler(IpcChannel.RequestsCreate, (_evt, input) => {
    const i = input as Partial<ApiRequest> & { name: string; method: HttpMethod }
    return requestsRepo.create(i)
  })

  registerHandler(IpcChannel.RequestsUpdate, (_evt, id, patch) =>
    requestsRepo.update(id as string, patch as Partial<ApiRequest>)
  )

  registerHandler(IpcChannel.RequestsDelete, (_evt, id) => {
    requestsRepo.delete(id as string)
  })
}
