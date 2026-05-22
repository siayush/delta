import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 880,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0b0b0c',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in the user's default browser, never in the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Block in-app navigation to anything other than the renderer entry —
  // prevents drive-by navigations from compromising the window context.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = is.dev && process.env['ELECTRON_RENDERER_URL']
    if (!allowed || !url.startsWith(process.env['ELECTRON_RENDERER_URL']!)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Surface renderer-side console errors in the main-process log so we
  // don't lose them if devtools isn't open.
  mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) {
      // eslint-disable-next-line no-console
      console.warn(`[renderer] ${source}:${line} ${message}`)
    }
  })

  return mainWindow
}
