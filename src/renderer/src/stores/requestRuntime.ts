import { create } from 'zustand'
import { api } from '../lib/api'
import { useResponseStore } from './response'
import type { SendRequestInput } from '@shared/types'

interface RuntimeEntry {
  // Cancel handle for the current in-flight send. Non-null = pending.
  // Resets to null once the send settles, regardless of outcome.
  sendId: string | null
  error: string | null
}

interface RuntimeState {
  byRequestId: Record<string, RuntimeEntry | undefined>
  startSend: (requestId: string, input: Omit<SendRequestInput, 'requestId'>) => Promise<void>
  cancel: (requestId: string) => void
  clear: (requestId: string) => void
}

export const useRequestRuntime = create<RuntimeState>((set, get) => ({
  byRequestId: {},
  startSend: async (requestId, input) => {
    const sendId = crypto.randomUUID()
    set((s) => ({
      byRequestId: { ...s.byRequestId, [requestId]: { sendId, error: null } }
    }))
    try {
      const response = await api.http.send({ ...input, requestId: sendId })
      // Bail if a newer send superseded this one — its result is what the user wants.
      if (get().byRequestId[requestId]?.sendId !== sendId) return
      useResponseStore.getState().setResponse(requestId, response)
      set((s) => ({
        byRequestId: { ...s.byRequestId, [requestId]: { sendId: null, error: null } }
      }))
    } catch (e) {
      if (get().byRequestId[requestId]?.sendId !== sendId) return
      const msg = e instanceof Error ? e.message : 'Request failed'
      useResponseStore.getState().setResponse(requestId, null)
      set((s) => ({
        byRequestId: { ...s.byRequestId, [requestId]: { sendId: null, error: msg } }
      }))
    }
  },
  cancel: (requestId) => {
    const entry = get().byRequestId[requestId]
    if (!entry?.sendId) return
    void api.http.cancel(entry.sendId)
  },
  clear: (requestId) => {
    const entry = get().byRequestId[requestId]
    // Best-effort: if a send is still in flight, ask main to abort so we don't
    // leak the network call. Its result will be discarded when it returns.
    if (entry?.sendId) void api.http.cancel(entry.sendId)
    set((s) => {
      const next = { ...s.byRequestId }
      delete next[requestId]
      return { byRequestId: next }
    })
  }
}))

export const useIsPending = (requestId: string): boolean =>
  useRequestRuntime((s) => Boolean(s.byRequestId[requestId]?.sendId))

export const useSendError = (requestId: string): string | null =>
  useRequestRuntime((s) => s.byRequestId[requestId]?.error ?? null)
