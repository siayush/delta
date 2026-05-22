import { type ReactNode, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Keyboard, Moon, Sun } from 'lucide-react'
import { Button } from './ui/Button'
import { Sidebar } from './Sidebar'
import { EnvironmentManager } from './EnvironmentManager'
import { UpdaterBanner } from './UpdaterBanner'
import { useUiStore } from '../stores/ui'
import { useCreateRequest } from '../queries/requests'

interface Props {
  children: ReactNode
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export function Layout({ children }: Props) {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const navigate = useNavigate()
  const createRequest = useCreateRequest()

  useEffect(() => {
    const onKey = async (e: KeyboardEvent): Promise<void> => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !isTyping) {
        e.preventDefault()
        const req = await createRequest.mutateAsync({ name: 'New Request', method: 'GET' })
        navigate({ to: '/requests/$requestId', params: { requestId: req.id } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createRequest, navigate])

  return (
    <div className="h-screen flex flex-col bg-(--color-bg) text-(--color-fg)">
      <header
        className="h-11 flex items-stretch border-b border-(--color-border) bg-(--color-bg-elev) shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/*
          macOS hiddenInset overlays the traffic lights on the header content.
          Reserve ~78px on the left so the brand never sits underneath them.
        */}
        <div
          className="flex items-center pr-3"
          style={{ paddingLeft: isMac ? 78 : 12 }}
        >
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 h-7 px-1.5 rounded-md hover:bg-(--color-bg) cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <DeltaMark />
            <span className="font-semibold tracking-tight text-[13px] leading-none">Delta</span>
            <span className="ml-1 inline-flex items-center h-[18px] px-1.5 rounded-md border border-(--color-border) text-(--color-fg-subtle) text-[9.5px] font-semibold uppercase tracking-wider leading-none">
              Alpha
            </span>
          </button>
        </div>

        <div className="flex-1" />

        <div
          className="flex items-center gap-1 pr-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <EnvironmentManager />
          <div className="w-px h-5 bg-(--color-border) mx-1" />
          <Button variant="ghost" size="icon" title="Keyboard shortcuts">
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <UpdaterBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function DeltaMark() {
  return (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-(--color-accent)/15 border border-(--color-accent)/30">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
        <path
          d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="text-(--color-accent)"
        />
        <path
          d="M8 6L11.5 12.5H4.5L8 6Z"
          fill="currentColor"
          className="text-(--color-accent)"
        />
      </svg>
    </span>
  )
}
