import { environmentsRepo } from '../db/repositories/environments'
import { IpcChannel } from '@shared/ipc'
import type { Environment } from '@shared/types'
import { registerHandler } from './registry'

export function registerEnvironmentsIpc(): void {
  registerHandler(IpcChannel.EnvironmentsList, () => environmentsRepo.list())
  registerHandler(IpcChannel.EnvironmentsCreate, (_evt, input) =>
    environmentsRepo.create(input as Omit<Environment, 'id' | 'createdAt'>)
  )
  registerHandler(IpcChannel.EnvironmentsUpdate, (_evt, id, patch) =>
    environmentsRepo.update(id as string, patch as Partial<Environment>)
  )
  registerHandler(IpcChannel.EnvironmentsDelete, (_evt, id) => {
    environmentsRepo.delete(id as string)
  })
}
