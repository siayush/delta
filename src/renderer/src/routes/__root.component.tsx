import { type ReactElement } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Layout } from '../components/Layout'

export function RootComponent(): ReactElement {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
