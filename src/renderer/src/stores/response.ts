import { create } from 'zustand'
import type { ApiResponse } from '@shared/types'

interface ResponseState {
  /** Latest response keyed by request id. Not persisted — ephemeral by design. */
  responses: Record<string, ApiResponse | undefined>
  setResponse: (requestId: string, response: ApiResponse | null) => void
  clearResponse: (requestId: string) => void
}

export const useResponseStore = create<ResponseState>((set) => ({
  responses: {},
  setResponse: (requestId, response) =>
    set((s) => ({
      responses: { ...s.responses, [requestId]: response ?? undefined }
    })),
  clearResponse: (requestId) =>
    set((s) => {
      const next = { ...s.responses }
      delete next[requestId]
      return { responses: next }
    })
}))
