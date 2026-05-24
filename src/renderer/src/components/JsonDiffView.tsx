import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { FileDiff } from '@pierre/diffs/react'
import { parseDiffFromFile } from '@pierre/diffs'
import { Maximize2, Minimize2 } from 'lucide-react'

const THEME = 'pierre-dark-soft'

// Bump the token-emphasis backgrounds so the changed-word highlight inside a
// red/green line is actually visible. The defaults sit at ~20% alpha on top of
// the line tint, which blends in to the point of looking line-level.
const TOKEN_HIGHLIGHT_CSS = `
  :host {
    --diffs-bg-deletion-override: transparent;
    --diffs-bg-addition-override: transparent;
    --diffs-bg-deletion-emphasis-override: rgba(255, 70, 70, 0.48);
    --diffs-bg-addition-emphasis-override: rgba(70, 210, 120, 0.44);
  }
`

interface Props {
  before: unknown
  after: unknown
  headerSlot?: React.ReactNode
}

export function JsonDiffView({ before, after, headerSlot }: Props): ReactElement {
  const [view, setView] = useState<'unified' | 'split'>('split')
  const [fullscreen, setFullscreen] = useState(false)

  const fileDiff = useMemo(() => {
    const beforeStr = stringify(before)
    const afterStr = stringify(after)
    return parseDiffFromFile(
      { name: 'baseline.json', contents: beforeStr },
      { name: 'current.json', contents: afterStr }
    )
  }, [before, after])

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
      <div className="grid grid-cols-3 items-center gap-3 px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev) shrink-0">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold justify-self-start">
          Diff
        </span>
        <div className="flex items-center justify-center min-w-0">{headerSlot}</div>
        <div className="flex items-center gap-1 text-[11px] justify-self-end">
          <button
            onClick={() => setView('unified')}
            className={`px-2 py-0.5 rounded ${view === 'unified' ? 'bg-(--color-bg) text-(--color-fg)' : 'text-(--color-fg-muted)'}`}
          >
            Unified
          </button>
          <button
            onClick={() => setView('split')}
            className={`px-2 py-0.5 rounded ${view === 'split' ? 'bg-(--color-bg) text-(--color-fg)' : 'text-(--color-fg-muted)'}`}
          >
            Split
          </button>
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
      </div>
      <div className="flex-1 min-h-0 overflow-auto text-[12px]">
        <FileDiff
          fileDiff={fileDiff}
          disableWorkerPool
          options={{
            diffStyle: view,
            disableFileHeader: true,
            overflow: 'wrap',
            themeType: 'dark',
            theme: THEME,
            unsafeCSS: TOKEN_HIGHLIGHT_CSS
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
