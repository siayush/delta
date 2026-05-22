import { registerRequestsIpc } from './requests'
import { registerFoldersIpc } from './folders'
import { registerSnapshotsIpc } from './snapshots'
import { registerEnvironmentsIpc } from './environments'
import { registerHttpIpc } from './http'
import { registerAppIpc } from './app'

export function registerAllIpc(): void {
  registerRequestsIpc()
  registerFoldersIpc()
  registerSnapshotsIpc()
  registerEnvironmentsIpc()
  registerHttpIpc()
  registerAppIpc()
}
