import { createRoute } from '@tanstack/react-router'
import { HomePage } from './index.component'
import { rootRoute } from './__root'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})
