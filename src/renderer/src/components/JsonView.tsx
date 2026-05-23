import { useMemo } from 'react'
import { CodeView, type CodeViewItem } from '@pierre/diffs/react'

const THEME = 'pierre-dark-soft'

interface Props {
  data: unknown
}

export function JsonView({ data }: Props) {
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

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev) shrink-0">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Response
        </span>
      </div>
      <CodeView
        items={items}
        className="flex-1 min-h-0 text-[12px]"
        disableWorkerPool
        options={{
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
