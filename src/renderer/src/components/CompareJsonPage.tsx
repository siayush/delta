import { type ReactElement, useMemo, useState } from 'react'
import { ArrowLeftRight, ClipboardPaste, Sparkles, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { JsonDiffView } from './JsonDiffView'

interface ParseResult {
  value: unknown
  error: string | null
  isJson: boolean
}

export function CompareJsonPage(): ReactElement {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')

  const leftParsed = useMemo(() => parseInput(left), [left])
  const rightParsed = useMemo(() => parseInput(right), [right])

  const bothEmpty = left.trim() === '' && right.trim() === ''
  const canDiff = !bothEmpty

  const handlePaste = async (target: 'left' | 'right'): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (target === 'left') setLeft(text)
      else setRight(text)
    } catch {
      // Clipboard access denied — no-op.
    }
  }

  const handleFormat = (target: 'left' | 'right'): void => {
    const source = target === 'left' ? left : right
    const formatted = tryFormat(source)
    if (target === 'left') setLeft(formatted)
    else setRight(formatted)
  }

  const handleSwap = (): void => {
    setLeft(right)
    setRight(left)
  }

  const handleClear = (): void => {
    setLeft('')
    setRight('')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-(--color-bg)">
      <div className="px-4 py-3 border-b border-(--color-border) flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold">Compare JSON</h2>
          <p className="text-[11.5px] text-(--color-fg-muted) mt-0.5">
            Paste two JSON values to diff them. Non-JSON text is compared as-is.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleSwap} disabled={bothEmpty}>
            <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={bothEmpty}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 shrink-0">
        <PasteBox
          label="Baseline"
          tone="danger"
          value={left}
          onChange={setLeft}
          parsed={leftParsed}
          onPaste={() => handlePaste('left')}
          onFormat={() => handleFormat('left')}
        />
        <PasteBox
          label="Current"
          tone="success"
          value={right}
          onChange={setRight}
          parsed={rightParsed}
          onPaste={() => handlePaste('right')}
          onFormat={() => handleFormat('right')}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
        {canDiff ? (
          <JsonDiffView before={leftParsed.value} after={rightParsed.value} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[13px] text-(--color-fg-muted)">
            Paste JSON in both boxes to see the diff.
          </div>
        )}
      </div>
    </div>
  )
}

interface PasteBoxProps {
  label: string
  tone: 'danger' | 'success'
  value: string
  onChange: (v: string) => void
  parsed: ParseResult
  onPaste: () => void
  onFormat: () => void
}

function PasteBox({
  label,
  tone,
  value,
  onChange,
  parsed,
  onPaste,
  onFormat
}: PasteBoxProps): ReactElement {
  const toneClass = tone === 'danger' ? 'text-(--color-danger)' : 'text-(--color-success)'
  const bytes = value.length
  const formattable = parsed.isJson && parsed.error === null

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-elev) flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 h-8 border-b border-(--color-border) shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10.5px] uppercase tracking-wider font-semibold ${toneClass}`}>
            {tone === 'danger' ? '–' : '+'} {label}
          </span>
          <Status parsed={parsed} bytes={bytes} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="Paste from clipboard"
            onClick={onPaste}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Pretty-print JSON"
            onClick={onFormat}
            disabled={!formattable}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder='Paste JSON here, e.g. { "id": 1, "name": "Item" }'
        className="flex-1 min-h-[140px] resize-none bg-transparent text-[12px] font-mono p-3 outline-none placeholder:text-(--color-fg-subtle)"
      />
    </div>
  )
}

function Status({ parsed, bytes }: { parsed: ParseResult; bytes: number }): ReactElement {
  if (bytes === 0) {
    return <span className="text-[11px] text-(--color-fg-subtle) font-mono">empty</span>
  }
  if (parsed.isJson && parsed.error === null) {
    return (
      <span className="text-[11px] text-(--color-success) font-mono">
        JSON · {formatBytes(bytes)}
      </span>
    )
  }
  if (parsed.error) {
    return (
      <span
        className="text-[11px] text-(--color-warn) font-mono truncate max-w-[260px]"
        title={parsed.error}
      >
        invalid JSON — diffing as text
      </span>
    )
  }
  return <span className="text-[11px] text-(--color-fg-subtle) font-mono">text · {formatBytes(bytes)}</span>
}

function parseInput(raw: string): ParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { value: '', error: null, isJson: false }
  // Heuristic: only attempt JSON.parse for inputs that start with one of the
  // JSON structural chars. Otherwise treat as plain text so we don't surface
  // a misleading error for casual string compares.
  const first = trimmed[0]
  const looksLikeJson =
    first === '{' || first === '[' || first === '"' || first === 't' || first === 'f' ||
    first === 'n' || (first >= '0' && first <= '9') || first === '-'
  if (!looksLikeJson) return { value: raw, error: null, isJson: false }
  try {
    return { value: JSON.parse(trimmed), error: null, isJson: true }
  } catch (e) {
    return {
      value: raw,
      error: e instanceof Error ? e.message : String(e),
      isJson: false
    }
  }
}

function tryFormat(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
