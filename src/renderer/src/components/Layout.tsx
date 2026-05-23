import { type ReactElement, type ReactNode, useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Home, Plus } from 'lucide-react'
import deltaLogo from '../assets/delta-logo.svg'
import { Button } from './ui/Button'
import { Sidebar } from './Sidebar'
import { SettingsSidebar } from './SettingsSidebar'
import { EnvironmentManager } from './EnvironmentManager'
import { UpdaterBanner } from './UpdaterBanner'
import { useCreateFolder } from '../queries/folders'
import { useCreateRequest, useRequests } from '../queries/requests'

interface Props {
  children: ReactNode
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export function Layout({ children }: Props): ReactElement {
  const navigate = useNavigate()
  const createRequest = useCreateRequest()
  const createFolder = useCreateFolder()
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
  const onSettings = matches.some((m) => m.routeId === '/settings')

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

  const brandTopSlot = (
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
      </button>
    </div>
  )

  return (
    <div className="h-screen flex bg-(--color-bg) text-(--color-fg)">
      {onSettings ? <SettingsSidebar topSlot={brandTopSlot} /> : <Sidebar topSlot={brandTopSlot} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-11 flex items-center shrink-0 select-none px-3 gap-1.5"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {onSettings ? (
            <span className="text-[13px] font-semibold">Settings</span>
          ) : (
            <>
              <div
                className="flex items-center gap-1.5"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: '/' })}
                  title="Home"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1" />

              <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewRequest}
                  title="New request (⌘N)"
                >
                  <Plus className="h-3.5 w-3.5" /> Add request
                </Button>
                <Button variant="ghost" size="sm" onClick={handleNewFolder} title="New folder">
                  New folder
                </Button>
                <EnvironmentManager />
              </div>
            </>
          )}
        </header>

        <UpdaterBanner />

        <main className="flex-1 flex flex-col overflow-hidden relative">{children}</main>
      </div>
    </div>
  )
}

function DeltaMark(): ReactElement {
  return <img src={deltaLogo} alt="Delta" className="h-5 w-5" draggable={false} />
}
