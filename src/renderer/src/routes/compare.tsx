import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: lazyRouteComponent(() => import('../components/CompareJsonPage'), 'CompareJsonPage')
})
