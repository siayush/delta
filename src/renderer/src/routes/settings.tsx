import { createRoute } from '@tanstack/react-router'
import { SettingsPage } from '../components/SettingsPage'
import { rootRoute } from './__root'

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
})
