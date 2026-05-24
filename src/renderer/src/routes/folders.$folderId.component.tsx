import { type ReactElement } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useFolders, useDeleteFolder } from '../queries/folders'
import { useRequests } from '../queries/requests'
import { NotFound } from '../components/NotFound'
import { Button } from '../components/ui/Button'

export function FolderPage(): ReactElement {
  const { folderId } = useParams({ from: '/folders/$folderId' })
  const navigate = useNavigate()
  const { data: folders = [] } = useFolders()
  const { data: requests = [] } = useRequests()
  const deleteFolder = useDeleteFolder()

  const folder = folders.find((f) => f.id === folderId) ?? null
  if (!folder) return <NotFound message="Folder not found" onHome={() => navigate({ to: '/' })} />

  const folderRequests = requests.filter((r) => r.folderId === folderId)

  return (
    <div className="flex-1 flex flex-col overflow-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">{folder.name}</h1>
          <p className="text-(--color-fg-muted) text-[12px] mt-1">
            {folderRequests.length} request{folderRequests.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await deleteFolder.mutateAsync(folder.id)
            navigate({ to: '/' })
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete folder
        </Button>
      </div>
      <div className="grid gap-2">
        {folderRequests.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate({ to: '/requests/$requestId', params: { requestId: r.id } })}
            className="text-left rounded-lg border border-(--color-border) bg-(--color-bg-elev) px-4 py-3 hover:border-(--color-border-strong)"
          >
            <div className="flex items-center gap-3">
              <span className={`method-${r.method} text-[11px] font-mono font-semibold`}>
                {r.method}
              </span>
              <span className="font-medium">{r.name}</span>
            </div>
            {r.url && (
              <div className="text-[12px] text-(--color-fg-muted) font-mono mt-1 truncate">
                {r.url}
              </div>
            )}
          </button>
        ))}
        {folderRequests.length === 0 && (
          <div className="text-(--color-fg-muted) text-[13px]">No requests in this folder yet.</div>
        )}
      </div>
    </div>
  )
}
