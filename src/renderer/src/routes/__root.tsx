import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Layout } from '../components/Layout'

export const rootRoute = createRootRoute({
  component: RootComponent
})

function RootComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
