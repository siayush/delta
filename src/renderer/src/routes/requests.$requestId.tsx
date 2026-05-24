import { createRoute } from '@tanstack/react-router'
import { RequestPage } from './requests.$requestId.component'
import { rootRoute } from './__root'

export const requestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests/$requestId',
  component: RequestPage
})
