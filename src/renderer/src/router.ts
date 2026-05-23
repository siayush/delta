import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { requestRoute } from './routes/requests.$requestId'
import { folderRoute } from './routes/folders.$folderId'
import { settingsRoute } from './routes/settings'
import { benchmarkRoute } from './routes/benchmark'

const routeTree = rootRoute.addChildren([
  indexRoute,
  requestRoute,
  folderRoute,
  settingsRoute,
  benchmarkRoute
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent'
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
