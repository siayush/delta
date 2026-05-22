import { app, shell } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import { registerHandler } from './registry'

export function registerAppIpc(): void {
  registerHandler(IpcChannel.AppGetVersion, () => app.getVersion())
  registerHandler(IpcChannel.AppOpenLogs, async () => {
    await shell.openPath(log.transports.file.getFile().path)
  })
}
