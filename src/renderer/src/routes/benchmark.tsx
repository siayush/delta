import { createRoute } from '@tanstack/react-router'
import { BenchmarkPage } from '../components/BenchmarkPage'
import { rootRoute } from './__root'

export const benchmarkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/benchmark',
  component: BenchmarkPage
})
