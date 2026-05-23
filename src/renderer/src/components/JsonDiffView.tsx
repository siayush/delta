import { useMemo, useRef, useState } from 'react'
import { CodeView, type CodeViewItem } from '@pierre/diffs/react'
import { parseDiffFromFile } from '@pierre/diffs'

const THEME = 'pierre-dark-soft'

interface Props {
  before: unknown
  after: unknown
}

export function JsonDiffView({ before, after }: Props) {
  const [view, setView] = useState<'unified' | 'split'>('unified')
  // CodeView reuses the item record across renders when the id matches and
  // only re-renders the diff body if `version` differs. Without a fresh
  // version, swapping `fileDiff` is silently ignored — bump it per content
  // change so the new diff is actually applied.
  const versionRef = useRef(0)

  const items = useMemo<CodeViewItem[]>(() => {
    const beforeStr = stringify(before)
    const afterStr = stringify(after)
    const fileDiff = parseDiffFromFile(
      { name: 'baseline.json', contents: beforeStr },
      { name: 'current.json', contents: afterStr }
    )
    versionRef.current += 1
    return [{ id: 'diff', type: 'diff', fileDiff, version: versionRef.current }]
  }, [before, after])

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev) shrink-0">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Diff
        </span>
        <div className="flex gap-0.5 text-[11px]">
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
        </div>
      </div>
      <CodeView
        items={items}
        className="flex-1 min-h-0 text-[12px]"
        disableWorkerPool
        options={{
          diffStyle: view,
          disableFileHeader: true,
          overflow: 'wrap',
          themeType: 'dark',
          theme: THEME
        }}
      />
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
