import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { preloadHighlighter } from '@pierre/diffs'
import './styles.css'
import { router } from './router'

// Warm the diff syntax highlighter so the first diff render isn't janky.
void preloadHighlighter({
  themes: ['pierre-dark-soft', 'pierre-light-soft'],
  langs: ['json']
})

const queryClient = new QueryClient({
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

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
