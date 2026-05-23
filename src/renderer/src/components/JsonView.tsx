import { useMemo } from 'react'
import { File } from '@pierre/diffs/react'

const THEME = 'pierre-dark-soft'

interface Props {
  data: unknown
}

export function JsonView({ data }: Props) {
  const file = useMemo(
    () => ({ name: 'response.json', contents: stringify(data) }),
    [data]
  )

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-(--color-border) bg-(--color-bg-elev)">
        <span className="text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">
          Response
        </span>
      </div>
      <div className="text-[12px] overflow-auto">
        <File
          file={file}
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
