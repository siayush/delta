import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const benchmarkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/benchmark',
  component: lazyRouteComponent(() => import('../components/BenchmarkPage'), 'BenchmarkPage')
})
