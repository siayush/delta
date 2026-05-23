import { type ReactElement, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Info, type LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

interface NavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'about', label: 'About', to: '/settings', icon: Info }
]

interface Props {
  topSlot?: ReactNode
}

export function SettingsSidebar({ topSlot }: Props = {}): ReactElement {
  const navigate = useNavigate()
  const matches = useRouterState({ select: (s) => s.matches })
  const activePath = matches.find((m) => m.routeId.startsWith('/settings'))?.pathname ?? '/settings'

  return (
    <aside className="w-64 shrink-0 border-r border-(--color-border) bg-(--color-bg-elev) flex flex-col">
      {topSlot}

      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = activePath === item.to
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                'h-8 px-2.5 flex items-center gap-2 rounded-md text-[12.5px]',
                active
                  ? 'bg-(--color-bg-active) text-(--color-fg)'
                  : 'text-(--color-fg-muted) hover:bg-(--color-bg-hover) hover:text-(--color-fg)'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-2">
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-full h-8 px-2 flex items-center gap-2 rounded-md text-[12.5px] text-(--color-fg-muted) hover:bg-(--color-bg-hover) hover:text-(--color-fg) cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>
    </aside>
  )
}
