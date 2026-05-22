import { app, BrowserWindow, dialog, session } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initLogger, logger } from './logger'
import { initDb, closeDb } from './db'
import { registerAllIpc } from './ipc'
import { createMainWindow, getMainWindow } from './window'
import { initUpdater } from './updater'

app.setName('Delta')
process.title = 'Delta'

initLogger()

// Single-instance lock — focus existing window instead of starting twice.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    try {
      electronApp.setAppUserModelId('com.delta.desktop')

      if (process.platform === 'darwin') app.dock?.setIcon(icon)

      // CSP — strict in production, relaxed in dev so Vite's HMR client
      // and the React Refresh preamble can run (both inject inline scripts).
      const csp = is.dev
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws://localhost:* http://localhost:*;"
        : "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self' data:; " +
          "connect-src 'self';"

      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [csp]
          }
        })
      })

      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
      })

      initDb()
      registerAllIpc()
      const win = createMainWindow()
      initUpdater(() => win)

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
      })
    } catch (err) {
      logger.error('Fatal startup error:', err)
      const message = err instanceof Error ? err.message : String(err)
      dialog.showErrorBox('Delta failed to start', `${message}\n\nLogs: ${app.getPath('logs')}`)
      app.exit(1)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    closeDb()
  })
}
