import log from 'electron-log/main'
import { app } from 'electron'

export function initLogger(): void {
  log.initialize()
  log.transports.file.level = 'info'
  log.transports.console.level = app.isPackaged ? 'warn' : 'debug'
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.errorHandler.startCatching({
    showDialog: false,
    onError({ error }) {
      log.error('[uncaught]', error)
    }
  })
}

export const logger = log.scope('main')
export const ipcLogger = log.scope('ipc')
export const dbLogger = log.scope('db')
