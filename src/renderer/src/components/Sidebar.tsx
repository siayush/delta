import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ArrowUpDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2
} from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useCreateRequest, useDeleteRequest, useRequests } from '../queries/requests'
import { useCreateFolder, useFolders } from '../queries/folders'
import { cn } from '../lib/utils'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

type SortMode = 'recent' | 'name'

interface SidebarProps {
  topSlot?: ReactNode
}

export function Sidebar({ topSlot }: SidebarProps = {}) {
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
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = search.trim().toLowerCase()
  const matchesQuery = (text: string | undefined): boolean =>
    !q || (text ?? '').toLowerCase().includes(q)

  const sortRequests = <T extends { name?: string | null; updatedAt?: number }>(items: T[]): T[] => {
    if (sortMode === 'name') {
      return [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    }
    return [...items].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  }

  const sortedFolders = useMemo(() => {
    if (sortMode === 'name') return [...folders].sort((a, b) => a.name.localeCompare(b.name))
    return folders
  }, [folders, sortMode])

  const unfiled = sortRequests(requests.filter((r) => !r.folderId && matchesQuery(r.name)))

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
      {topSlot}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-(--color-fg-subtle) pointer-events-none" />
          <Input
            ref={searchRef}
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-10 h-8"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center h-[18px] px-1.5 rounded border border-(--color-border) bg-(--color-bg) text-[10px] text-(--color-fg-subtle) font-mono pointer-events-none">
            {isMac ? '⌘K' : '^K'}
          </kbd>
        </div>
      </div>

      <div className="h-8 px-3 flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Projects
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortMode((m) => (m === 'recent' ? 'name' : 'recent'))}
            title={sortMode === 'recent' ? 'Sorted by recent — click for name' : 'Sorted by name — click for recent'}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewFolder(true)}
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showNewFolder && (
        <form onSubmit={handleSubmitFolder} className="p-2 border-y border-(--color-border)">
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

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {sortedFolders.map((f) => {
          const isOpen = openFolders[f.id] ?? true
          const folderRequests = sortRequests(
            requests.filter((r) => r.folderId === f.id && matchesQuery(r.name))
          )
          const folderMatchesQuery = matchesQuery(f.name)
          if (q && !folderMatchesQuery && folderRequests.length === 0) return null

          return (
            <div key={f.id} className="mb-0.5">
              <div className="flex items-center group rounded-md hover:bg-(--color-bg-hover)">
                <button
                  onClick={() => setOpenFolders((o) => ({ ...o, [f.id]: !isOpen }))}
                  className="h-7 w-5 flex items-center justify-center text-(--color-fg-subtle) hover:text-(--color-fg)"
                >
                  <ChevronRight
                    className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
                  />
                </button>
                <Link
                  to="/folders/$folderId"
                  params={{ folderId: f.id }}
                  className="flex items-center gap-2 flex-1 min-w-0 text-[13px]"
                >
                  <Folder className="h-3.5 w-3.5 text-(--color-fg-muted) shrink-0" />
                  <span className="truncate">{f.name}</span>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 mr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNewRequest(f.id)
                  }}
                  title="New request in folder"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {isOpen && folderRequests.length > 0 && (
                <div className="pl-5">
                  {folderRequests.map((r) => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      active={r.id === activeRequestId}
                      onDelete={() => deleteRequest.mutate(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {unfiled.length > 0 && (
          <div className={folders.length > 0 ? 'mt-1' : ''}>
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

        {q && unfiled.length === 0 && sortedFolders.every((f) =>
          requests.filter((r) => r.folderId === f.id && matchesQuery(r.name)).length === 0 &&
          !matchesQuery(f.name)
        ) && (
          <div className="text-[12px] text-(--color-fg-muted) px-2 py-4 text-center">
            No matches.
          </div>
        )}
      </div>

      <div>
        <button className="w-full h-9 px-3 flex items-center gap-2 text-[12.5px] text-(--color-fg-muted) hover:bg-(--color-bg) hover:text-(--color-fg)">
          <SettingsIcon className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </aside>
  )
}

interface RowProps {
  request: { id: string; name: string; method: string; url: string; updatedAt?: number }
  active: boolean
  onDelete: () => void
}

function RequestRow({ request, active, onDelete }: RowProps) {
  const methodLabel = methodShortLabel(request.method)
  return (
    <Link
      to="/requests/$requestId"
      params={{ requestId: request.id }}
      className={cn(
        'group flex items-center gap-1.5 rounded-md px-2 h-7 text-[12.5px] text-(--color-fg-muted) hover:bg-(--color-bg-hover) hover:text-(--color-fg)',
        active && 'bg-(--color-bg-hover) text-(--color-fg)'
      )}
      title={request.method + ' · ' + (request.url || request.name)}
    >
      <span
        className={cn(
          `method-${request.method}`,
          'shrink-0 font-semibold text-[10.5px] tracking-wider uppercase'
        )}
      >
        {methodLabel}
      </span>
      <span className="truncate flex-1">{request.name || 'Untitled'}</span>
      {request.updatedAt ? (
        <span className="text-[11px] text-(--color-fg-subtle) shrink-0 group-hover:hidden">
          {formatRelative(request.updatedAt)}
        </span>
      ) : null}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete()
        }}
        className="hidden group-hover:inline-flex text-(--color-fg-muted) hover:text-(--color-danger)"
        title="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </Link>
  )
}

function methodShortLabel(method: string): string {
  switch (method) {
    case 'DELETE':
      return 'DEL'
    case 'OPTIONS':
      return 'OPT'
    case 'PATCH':
      return 'PCH'
    default:
      return method
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
