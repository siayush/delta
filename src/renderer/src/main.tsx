import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { preloadHighlighter } from '@pierre/diffs'
import { WorkerPoolContextProvider } from '@pierre/diffs/react'
// Vite returns the resolved worker URL from this query suffix.
import DiffsWorkerUrl from '@pierre/diffs/worker/worker.js?worker&url'
import './styles.css'
import { router } from './router'
import { queryClient } from './lib/queryClient'

// Warm the diff syntax highlighter so the first diff render isn't janky.
void preloadHighlighter({
  themes: ['pierre-dark-soft'],
  langs: ['json']
})

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root')

createRoot(container).render(
  <StrictMode>
    <WorkerPoolContextProvider
      poolOptions={{
        workerFactory: () => new Worker(DiffsWorkerUrl, { type: 'module' }),
        poolSize: 3
      }}
      highlighterOptions={{
        theme: 'pierre-dark-soft',
        langs: ['json'],
        useTokenTransformer: true
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WorkerPoolContextProvider>
  </StrictMode>
)
