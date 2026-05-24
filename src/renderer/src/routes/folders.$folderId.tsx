import { createRoute } from '@tanstack/react-router'
import { FolderPage } from './folders.$folderId.component'
import { rootRoute } from './__root'

export const folderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/folders/$folderId',
  component: FolderPage
})
