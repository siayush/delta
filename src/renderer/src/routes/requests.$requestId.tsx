import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const requestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests/$requestId',
  component: lazyRouteComponent(() => import('./requests.$requestId.component'), 'RequestPage')
})
