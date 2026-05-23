import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data lives in local SQLite — no network latency to amortize,
      // but we still avoid hammering IPC on every window focus.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    },
    mutations: { retry: 0 }
  }
})
