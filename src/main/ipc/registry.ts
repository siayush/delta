import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ipcLogger } from '../logger'

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>

/**
 * Wraps an ipcMain.handle registration with consistent logging and
 * a stable error contract so the renderer never sees raw stack traces.
 */
export function registerHandler(channel: string, handler: Handler): void {
  ipcMain.handle(channel, async (event, ...args) => {
    const started = performance.now()
    try {
      const result = await handler(event, ...args)
      const ms = (performance.now() - started).toFixed(1)
      ipcLogger.debug(`${channel} ok in ${ms}ms`)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      ipcLogger.error(`${channel} failed:`, err)
      throw new Error(message)
    }
  })
}
