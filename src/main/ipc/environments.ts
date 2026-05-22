import { environmentsRepo } from '../db/repositories/environments'
import { IpcChannel } from '@shared/ipc'
import { registerHandler } from './registry'

export function registerEnvironmentsIpc(): void {
  registerHandler(IpcChannel.EnvironmentsList, () => environmentsRepo.list())
  registerHandler(IpcChannel.EnvironmentsCreate, (_evt, input) => environmentsRepo.create(input))
  registerHandler(IpcChannel.EnvironmentsUpdate, (_evt, id, patch) =>
    environmentsRepo.update(id, patch)
  )
  registerHandler(IpcChannel.EnvironmentsDelete, (_evt, id) => {
    environmentsRepo.delete(id)
  })
}
