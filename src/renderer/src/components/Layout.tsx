import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, FolderOpen, Keyboard, Plus } from 'lucide-react'
import deltaLogo from '../assets/delta-logo.svg'
import { Button } from './ui/Button'
import { Sidebar } from './Sidebar'
import { EnvironmentManager } from './EnvironmentManager'
import { UpdaterBanner } from './UpdaterBanner'
import { useCreateFolder, useFolders } from '../queries/folders'
import { useCreateRequest, useRequests } from '../queries/requests'
import { cn } from '../lib/utils'

interface Props {
  children: ReactNode
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export function Layout({ children }: Props) {
  const navigate = useNavigate()
  const createRequest = useCreateRequest()
  const createFolder = useCreateFolder()
  const { data: folders = [] } = useFolders()
  const { data: requests = [] } = useRequests()

  const matches = useRouterState({ select: (s) => s.matches })
  const activeFolderId =
    (matches.find((m) => m.routeId === '/folders/$folderId')?.params['folderId' as never] as
      | string
      | undefined) ?? null
  const activeRequestId =
    (matches.find((m) => m.routeId === '/requests/$requestId')?.params['requestId' as never] as
      | string
      | undefined) ?? null
  const activeRequest = requests.find((r) => r.id === activeRequestId) ?? null
  const workspaceLabel =
    folders.find((f) => f.id === activeFolderId)?.name ??
    folders.find((f) => f.id === activeRequest?.folderId)?.name ??
    'Workspace'

  const handleNewRequest = async (): Promise<void> => {
    const req = await createRequest.mutateAsync({
      name: 'New Request',
      method: 'GET',
      folderId: activeFolderId ?? activeRequest?.folderId ?? null
    })
    navigate({ to: '/requests/$requestId', params: { requestId: req.id } })
  }

  const handleNewFolder = async (): Promise<void> => {
    const folder = await createFolder.mutateAsync('New Folder')
    navigate({ to: '/folders/$folderId', params: { folderId: folder.id } })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !isTyping) {
        e.preventDefault()
        void handleNewRequest()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="h-screen flex bg-(--color-bg) text-(--color-fg)">
      <Sidebar
        topSlot={
          <div
            className="h-11 flex items-center shrink-0 select-none"
            style={
              {
                WebkitAppRegion: 'drag',
                paddingLeft: isMac ? 78 : 12
              } as React.CSSProperties
            }
          >
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 h-7 px-1.5 rounded-md hover:bg-(--color-bg-hover) cursor-pointer"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <DeltaMark />
              <span className="font-semibold tracking-tight text-[13px] leading-none">Delta</span>
              <span className="ml-1 inline-flex items-center h-[18px] px-1.5 rounded-md border border-(--color-border) text-(--color-fg-subtle) text-[9.5px] font-semibold uppercase tracking-wider leading-none">
                Alpha
              </span>
            </button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-11 flex items-center shrink-0 select-none px-3 gap-1.5"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div
            className="flex items-center gap-1.5"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WorkspaceChip label={workspaceLabel} />
            <EnvironmentManager />
          </div>

          <div className="flex-1" />

          <div
            className="flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <Button variant="ghost" size="sm" onClick={handleNewRequest} title="New request (⌘N)">
              <Plus className="h-3.5 w-3.5" /> Add request
            </Button>
            <OpenMenu />
            <Button variant="ghost" size="sm" onClick={handleNewFolder} title="New folder">
              New folder
            </Button>
            <div className="w-px h-5 bg-(--color-border) mx-1" />
            <Button variant="ghost" size="icon" title="Keyboard shortcuts">
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <UpdaterBanner />

        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function WorkspaceChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-[22px] px-2 rounded-[5px] bg-(--color-input)/40 border border-(--color-border) text-[11px] text-(--color-fg) max-w-[180px] truncate">
      {label}
    </span>
  )
}

function OpenMenu() {
  const [open, setOpen] = useState(false)
  const { data: requests = [] } = useRequests()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const recent = [...requests]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} title="Open request">
        <FolderOpen className="h-3.5 w-3.5" /> Open <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-lg border border-(--color-border) bg-(--color-bg-elev) shadow-xl z-30 p-1">
          {recent.length === 0 && (
            <div className="px-2 py-3 text-[12px] text-(--color-fg-muted) text-center">
              No requests yet
            </div>
          )}
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setOpen(false)
                navigate({ to: '/requests/$requestId', params: { requestId: r.id } })
              }}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-(--color-bg-hover) inline-flex items-center gap-2'
              )}
            >
              <span
                className={`method-${r.method} h-1.5 w-1.5 rounded-full shrink-0`}
                style={{ background: 'currentColor' }}
              />
              <span className="truncate flex-1">{r.name || 'Untitled'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DeltaMark() {
  return <img src={deltaLogo} alt="Delta" className="h-5 w-5" draggable={false} />
}
