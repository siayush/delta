import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IpcChannel, type UpdaterEvent } from '@shared/ipc'
import { logger } from './logger'

function emit(win: BrowserWindow | null, event: UpdaterEvent): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(IpcChannel.UpdaterEvent, event)
}

export function initUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = logger

  autoUpdater.on('checking-for-update', () => emit(getWindow(), { type: 'checking' }))
  autoUpdater.on('update-available', (i) =>
    emit(getWindow(), { type: 'available', version: i.version })
  )
  autoUpdater.on('update-not-available', () => emit(getWindow(), { type: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    emit(getWindow(), { type: 'downloading', percent: p.percent })
  )
  autoUpdater.on('update-downloaded', (i) =>
    emit(getWindow(), { type: 'downloaded', version: i.version })
  )
  autoUpdater.on('error', (err) =>
    emit(getWindow(), { type: 'error', message: err?.message ?? String(err) })
  )

  ipcMain.handle(IpcChannel.UpdaterCheck, async () => {
    if (!app.isPackaged) {
      logger.info('Skipping update check in dev')
      return
    }
    try {
      await autoUpdater.checkForUpdatesAndNotify()
    } catch (err) {
      logger.error('Updater check failed:', err)
    }
  })

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => logger.error(err))
    }, 5_000)
  }
}
