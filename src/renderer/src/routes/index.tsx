import { createRoute, useNavigate } from '@tanstack/react-router'
import { FileCode2, Plus } from 'lucide-react'
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
        <div className="h-14 w-14 rounded-2xl bg-(--color-bg-elev) border border-(--color-border) flex items-center justify-center mb-5">
          <DeltaMark className="h-6 w-6" />
        </div>
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

function DeltaMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-(--color-accent)"
      />
      <path d="M8 6L11.5 12.5H4.5L8 6Z" fill="currentColor" className="text-(--color-accent)" />
    </svg>
  )
}
