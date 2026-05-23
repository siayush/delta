import { useEffect, useMemo, useState } from 'react'
import { CodeView, type CodeViewItem } from '@pierre/diffs/react'
import { Maximize2, Minimize2 } from 'lucide-react'

const THEME = 'pierre-dark-soft'

interface Props {
  data: unknown
}

export function JsonView({ data }: Props) {
  const [fullscreen, setFullscreen] = useState(false)

  const items = useMemo<CodeViewItem[]>(
    () => [
      {
        id: 'response',
        type: 'file',
        file: { name: 'response.json', contents: stringify(data) }
      }
    ],
    [data]
  )

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  return (
    <div
      className={
        fullscreen
          ? 'absolute inset-0 z-40 flex flex-col bg-(--color-bg)'
          : 'border border-(--color-border) rounded-lg overflow-hidden flex flex-col min-h-0'
      }
    >
      <div className="flex items-center justify-between px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev) shrink-0">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Response
        </span>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="text-(--color-fg-muted) hover:text-(--color-fg) p-1 rounded hover:bg-(--color-bg)"
          title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
        >
          {fullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto text-[12px]">
        <CodeView
          items={items}
          disableWorkerPool
          options={{
            disableFileHeader: true,
            overflow: 'wrap',
            themeType: 'dark',
            theme: THEME
          }}
        />
      </div>
    </div>
  )
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2) ?? ''
  } catch {
    return String(v)
  }
}
