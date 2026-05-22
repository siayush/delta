import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronRight, Folder, FolderPlus, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useCreateRequest, useDeleteRequest, useRequests } from '../queries/requests'
import { useCreateFolder, useFolders } from '../queries/folders'
import { cn } from '../lib/utils'

export function Sidebar() {
  const { data: requests = [] } = useRequests()
  const { data: folders = [] } = useFolders()
  const createRequest = useCreateRequest()
  const deleteRequest = useDeleteRequest()
  const createFolder = useCreateFolder()
  const navigate = useNavigate()
  const matches = useRouterState({ select: (s) => s.matches })
  const activeRequestId =
    matches.find((m) => m.routeId === '/requests/$requestId')?.params['requestId' as never] ?? null

  const [folderName, setFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({})

  const unfiled = requests.filter((r) => !r.folderId)

  const handleNewRequest = async (folderId?: string): Promise<void> => {
    const req = await createRequest.mutateAsync({
      name: 'New Request',
      method: 'GET',
      folderId: folderId ?? null
    })
    navigate({ to: '/requests/$requestId', params: { requestId: req.id } })
  }

  const handleSubmitFolder = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = folderName.trim()
    if (!name) return
    await createFolder.mutateAsync(name)
    setFolderName('')
    setShowNewFolder(false)
  }

  return (
    <aside className="w-64 shrink-0 border-r border-(--color-border) bg-(--color-bg-elev) flex flex-col">
      <div className="h-9 px-3 flex items-center justify-between border-b border-(--color-border)">
        <span className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Collection
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewFolder(true)}
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNewRequest()}
            title="New request (⌘N)"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showNewFolder && (
        <form onSubmit={handleSubmitFolder} className="p-2 border-b border-(--color-border)">
          <Input
            autoFocus
            placeholder="Folder name…"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onBlur={() => {
              if (!folderName) setShowNewFolder(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowNewFolder(false)
                setFolderName('')
              }
            }}
          />
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-1.5">
        {folders.map((f) => {
          const isOpen = openFolders[f.id] ?? true
          const folderRequests = requests.filter((r) => r.folderId === f.id)
          return (
            <div key={f.id} className="mb-1">
              <div className="flex items-center group rounded px-1 py-0.5 hover:bg-(--color-bg)">
                <button
                  onClick={() => setOpenFolders((o) => ({ ...o, [f.id]: !isOpen }))}
                  className="p-0.5 rounded hover:bg-(--color-border)"
                >
                  <ChevronRight
                    className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
                  />
                </button>
                <Link
                  to="/folders/$folderId"
                  params={{ folderId: f.id }}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-[12.5px] py-1"
                >
                  <Folder className="h-3.5 w-3.5 text-(--color-fg-muted) shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-[10.5px] text-(--color-fg-subtle)">
                    {folderRequests.length}
                  </span>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNewRequest(f.id)
                  }}
                  title="New request in folder"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {isOpen && (
                <div className="ml-4 border-l border-(--color-border) pl-1">
                  {folderRequests.map((r) => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      active={r.id === activeRequestId}
                      onDelete={() => deleteRequest.mutate(r.id)}
                    />
                  ))}
                  {folderRequests.length === 0 && (
                    <div className="text-[11px] text-(--color-fg-subtle) px-2 py-1">Empty</div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {unfiled.length > 0 && (
          <div className="mt-2">
            {folders.length > 0 && (
              <div className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold px-2 py-1">
                Unfiled
              </div>
            )}
            {unfiled.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                active={r.id === activeRequestId}
                onDelete={() => deleteRequest.mutate(r.id)}
              />
            ))}
          </div>
        )}

        {requests.length === 0 && folders.length === 0 && (
          <div className="text-[12px] text-(--color-fg-muted) px-2 py-4 text-center">
            No requests yet.
          </div>
        )}
      </div>
    </aside>
  )
}

interface RowProps {
  request: { id: string; name: string; method: string; url: string }
  active: boolean
  onDelete: () => void
}

function RequestRow({ request, active, onDelete }: RowProps) {
  return (
    <Link
      to="/requests/$requestId"
      params={{ requestId: request.id }}
      className={cn(
        'group flex items-center gap-2 rounded px-2 py-1 text-[12.5px] hover:bg-(--color-bg)',
        active && 'bg-(--color-bg) text-(--color-fg)'
      )}
    >
      <span className={`method-${request.method} text-[10px] font-mono font-bold w-9 shrink-0`}>
        {request.method}
      </span>
      <span className="truncate flex-1">{request.name || 'Untitled'}</span>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 text-(--color-fg-muted) hover:text-(--color-danger)"
        title="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </Link>
  )
}
