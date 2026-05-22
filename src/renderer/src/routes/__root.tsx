import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Layout } from '../components/Layout'
import { useUiStore } from '../stores/ui'

export const rootRoute = createRootRoute({
  component: RootComponent
})

function RootComponent() {
  const theme = useUiStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
