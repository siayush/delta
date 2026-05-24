import { type ReactElement } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useRequests } from '../queries/requests'
import { RequestEditor } from '../components/RequestEditor'
import { ResponseViewer } from '../components/ResponseViewer'
import { NotFound } from '../components/NotFound'

export function RequestPage(): ReactElement {
  const { requestId } = useParams({ from: '/requests/$requestId' })
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
