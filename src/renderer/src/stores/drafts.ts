import { create } from 'zustand'
import { api } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { queryKeys } from '../queries/keys'
import type { ApiRequest } from '@shared/types'

const DEBOUNCE_MS = 400

interface DraftState {
  byRequestId: Record<string, ApiRequest | undefined>
  /** Seed draft from server-side request the first time we touch it. */
  ensure: (request: ApiRequest) => ApiRequest
  patch: (requestId: string, changes: Partial<ApiRequest>) => void
  flush: (requestId: string) => void
  flushAll: () => void
  clear: (requestId: string) => void
}

const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {}

const writeCache = (draft: ApiRequest): void => {
  queryClient.setQueryData<ApiRequest[]>(queryKeys.requests, (old) => {
    if (!old) return old
    return old.map((r) => (r.id === draft.id ? { ...r, ...draft, updatedAt: Date.now() } : r))
  })
}

const persist = (draft: ApiRequest): void => {
  // Cache was already updated optimistically on each patch; we only push the write
  // and trust the IPC echo. On failure, refetch to converge the cache with server truth
  // so the user's optimistic edits don't silently linger past a rejected save.
  void api.requests
    .update(draft.id, {
      name: draft.name,
      method: draft.method,
      url: draft.url,
      headers: draft.headers,
      queryParams: draft.queryParams,
      body: draft.body,
      auth: draft.auth,
      folderId: draft.folderId
    })
    .catch(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests })
    })
}

export const useDraftStore = create<DraftState>((set, get) => ({
  byRequestId: {},
  ensure: (request) => {
    const existing = get().byRequestId[request.id]
    if (existing) return existing
    set((s) => ({ byRequestId: { ...s.byRequestId, [request.id]: request } }))
    return request
  },
  patch: (requestId, changes) => {
    const current = get().byRequestId[requestId]
    if (!current) return
    const next = { ...current, ...changes }
    set((s) => ({ byRequestId: { ...s.byRequestId, [requestId]: next } }))
    // Mirror into the requests cache immediately so the sidebar/list reflect
    // the edit without waiting for the debounced write.
    writeCache(next)
    const existing = timers[requestId]
    if (existing) clearTimeout(existing)
    timers[requestId] = setTimeout(() => get().flush(requestId), DEBOUNCE_MS)
  },
  flush: (requestId) => {
    const t = timers[requestId]
    if (t) {
      clearTimeout(t)
      delete timers[requestId]
    }
    const draft = get().byRequestId[requestId]
    if (!draft) return
    persist(draft)
  },
  flushAll: () => {
    for (const id of Object.keys(timers)) get().flush(id)
  },
  clear: (requestId) => {
    const t = timers[requestId]
    if (t) {
      clearTimeout(t)
      delete timers[requestId]
    }
    set((s) => {
      const next = { ...s.byRequestId }
      delete next[requestId]
      return { byRequestId: next }
    })
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => useDraftStore.getState().flushAll())
}
