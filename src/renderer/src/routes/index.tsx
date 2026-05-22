import { createRoute, useNavigate } from '@tanstack/react-router'
import { FileCode2, Plus } from 'lucide-react'
import deltaLogo from '../assets/delta-logo.svg'
import { Button } from '../components/ui/Button'
import { useCreateRequest, useRequests } from '../queries/requests'
import { rootRoute } from './__root'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})

function HomePage() {
  const { data: requests = [] } = useRequests()
  const create = useCreateRequest()
  const navigate = useNavigate()

  const handleCreate = async (): Promise<void> => {
    const req = await create.mutateAsync({ name: 'New Request', method: 'GET' })
    navigate({ to: '/requests/$requestId', params: { requestId: req.id } })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-(--color-bg)">
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        <img src={deltaLogo} alt="Delta" className="h-14 w-14 mb-5" draggable={false} />
        <h2 className="text-[15px] font-semibold mb-1.5">
          {requests.length ? 'Select a request' : 'Start with your first request'}
        </h2>
        <p className="text-[13px] text-(--color-fg-muted) mb-6 max-w-xs">
          Build a request, save a snapshot of the response, and diff future responses against it.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} disabled={create.isPending}>
            <Plus className="h-3.5 w-3.5" /> New request
          </Button>
          <Button variant="outline" disabled>
            <FileCode2 className="h-3.5 w-3.5" /> Import cURL
          </Button>
        </div>
      </div>
    </div>
  )
}

