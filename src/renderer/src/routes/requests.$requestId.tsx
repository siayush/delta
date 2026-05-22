import { createRoute, useNavigate } from '@tanstack/react-router'
import { useRequests } from '../queries/requests'
import { RequestEditor } from '../components/RequestEditor'
import { ResponseViewer } from '../components/ResponseViewer'
import { NotFound } from '../components/NotFound'
import { rootRoute } from './__root'

export const requestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests/$requestId',
  component: RequestPage
})

function RequestPage() {
  const { requestId } = requestRoute.useParams()
  const navigate = useNavigate()
  const { data: requests = [], isLoading } = useRequests()
  const request = requests.find((r) => r.id === requestId) ?? null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-(--color-fg-muted)">
        Loading…
      </div>
    )
  }
  if (!request) {
    return <NotFound message="Request not found" onHome={() => navigate({ to: '/' })} />
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <RequestEditor request={request} />
      <ResponseViewer requestId={request.id} />
    </div>
  )
}
