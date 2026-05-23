import { useMemo, useState } from 'react'
import { FileDiff } from '@pierre/diffs/react'
import { parseDiffFromFile } from '@pierre/diffs'

const THEME = 'pierre-dark-soft'

interface Props {
  before: unknown
  after: unknown
}

export function JsonDiffView({ before, after }: Props) {
  const [view, setView] = useState<'unified' | 'split'>('unified')

  const fileDiff = useMemo(() => {
    const beforeStr = stringify(before)
    const afterStr = stringify(after)
    return parseDiffFromFile(
      { name: 'baseline.json', contents: beforeStr },
      { name: 'current.json', contents: afterStr }
    )
  }, [before, after])

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev)">
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
      <div className="text-[12px] overflow-auto">
        <FileDiff
          fileDiff={fileDiff}
          options={{
            diffStyle: view,
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
