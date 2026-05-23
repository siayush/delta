import { createRoute } from '@tanstack/react-router'
import { CompareJsonPage } from '../components/CompareJsonPage'
import { rootRoute } from './__root'

export const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: CompareJsonPage
})
