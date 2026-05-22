import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ipcLogger } from '../logger'
import {
  ipcSchemas,
  type IpcArgs,
  type IpcResult,
  type IpcSchemaChannel
} from '@shared/ipc-schemas'

type Handler<C extends IpcSchemaChannel> = (
  event: IpcMainInvokeEvent,
  ...args: IpcArgs<C>
) => IpcResult<C> | Promise<IpcResult<C>>

/**
 * Wraps ipcMain.handle with Zod validation: inbound args are decoded
 * against the channel schema, and the handler's return value is encoded
 * before crossing back to the renderer. Drift between renderer call sites
 * and main handlers fails loudly here rather than silently corrupting state.
 */
export function registerHandler<C extends IpcSchemaChannel>(channel: C, handler: Handler<C>): void {
  const schema = ipcSchemas[channel]
  ipcMain.handle(channel, async (event, ...rawArgs: unknown[]) => {
    const started = performance.now()

    const parsedArgs = schema.args.safeParse(rawArgs)
    if (!parsedArgs.success) {
      ipcLogger.error(`${channel} invalid args:`, parsedArgs.error.issues)
      throw new Error(`Invalid arguments for ${channel}`)
    }

    try {
      const result = await handler(event, ...(parsedArgs.data as IpcArgs<C>))
      const parsedResult = schema.result.safeParse(result)
      if (!parsedResult.success) {
        ipcLogger.error(`${channel} invalid result:`, parsedResult.error.issues)
        throw new Error(`Handler for ${channel} returned an invalid result`)
      }
      const ms = (performance.now() - started).toFixed(1)
      ipcLogger.debug(`${channel} ok in ${ms}ms`)
      return parsedResult.data
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      ipcLogger.error(`${channel} failed:`, err)
      throw new Error(message)
    }
  })
}
