import {
  type ClipboardEvent,
  type ReactElement,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  ArrowLeftRight,
  ClipboardPaste,
  Maximize2,
  Minimize2,
  Sparkles,
  Trash2
} from 'lucide-react'
import { getHighlighterIfLoaded, getSharedHighlighter, type ThemedToken } from '@pierre/diffs'
import { Button } from './ui/Button'
import { JsonDiffView } from './JsonDiffView'

const SHIKI_THEME = 'pierre-dark-soft'
const SHIKI_LANG = 'json'

// Re-renders the caller once the shared Shiki highlighter resolves so the
// overlay can switch from the regex fallback to themed tokens.
function useShikiReady(): boolean {
  const [ready, setReady] = useState(() => getHighlighterIfLoaded() != null)
  useEffect(() => {
    if (ready) return
    let cancelled = false
    void getSharedHighlighter({ themes: [SHIKI_THEME], langs: [SHIKI_LANG] }).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [ready])
  return ready
}

function tokenizeLinesWithShiki(lines: string[]): ThemedToken[][] | null {
  const h = getHighlighterIfLoaded()
  if (!h) return null
  try {
    return h.codeToTokensBase(lines.join('\n'), { lang: SHIKI_LANG, theme: SHIKI_THEME })
  } catch {
    return null
  }
}

interface ParseResult {
  value: unknown
  error: string | null
  isJson: boolean
}

// Keep large paste off the CodeMirror/React critical path. The native textarea is
// intentionally uncontrolled; React only sees small status updates immediately,
// then receives the full text after this debounce gates parse + diff rendering.
const COMMIT_DEBOUNCE_MS = 250
const EDITOR_HEIGHT = 220
const EDITOR_LINE_HEIGHT = 20
const EDITOR_VERTICAL_PADDING = 8
const EDITOR_HORIZONTAL_PADDING = 12
const VISIBLE_LINE_OVERSCAN = 5
const LARGE_RENDER_DELAY_BYTES = 500_000
const MAX_HIGHLIGHT_CHARS = 80_000
const MAX_HIGHLIGHT_LINE_CHARS = 20_000

interface EditorRenderLine {
  number: number
  text: string
}

interface EditorRenderState {
  lineCount: number
  gutterWidth: number
  topOffset: number
  scrollLeft: number
  syntaxEnabled: boolean
  lines: EditorRenderLine[]
}

export function CompareJsonPage(): ReactElement {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  // Bumped only by explicit toolbar actions (format/swap/clear) to re-seed the
  // uncontrolled textarea. Typing/pasting does not bump these; the textarea DOM
  // stays the source of truth between debounced commits.
  const [leftKey, setLeftKey] = useState(0)
  const [rightKey, setRightKey] = useState(0)

  // Defer the values that feed parseInput + JsonDiffView. After a debounced
  // commit lands, React renders the rest of the page immediately and schedules
  // the heavy parse + diff render as low-priority work. The worker pool (set up
  // in main.tsx) handles highlighting off-thread; useDeferredValue keeps the
  // remaining main-thread work from blocking subsequent interactions.
  const deferredLeft = useDeferredValue(left)
  const deferredRight = useDeferredValue(right)
  const leftParsed = useMemo(() => parseInput(deferredLeft), [deferredLeft])
  const rightParsed = useMemo(() => parseInput(deferredRight), [deferredRight])

  const leftEmpty = left.trim() === ''
  const rightEmpty = right.trim() === ''
  const bothEmpty = leftEmpty && rightEmpty
  // Only diff when BOTH sides have content. Diffing "1MB vs empty" is just as
  // expensive as a real diff (50k lines of removals) and would lock the UI on
  // each individual paste before the second box is filled.
  const canDiff = !leftEmpty && !rightEmpty

  const seedLeft = (text: string): void => {
    setLeft(text)
    setLeftKey((n) => n + 1)
  }
  const seedRight = (text: string): void => {
    setRight(text)
    setRightKey((n) => n + 1)
  }

  const handleFormat = (target: 'left' | 'right'): void => {
    const source = target === 'left' ? left : right
    const formatted = tryFormat(source)
    if (target === 'left') seedLeft(formatted)
    else seedRight(formatted)
  }

  const handleSwap = (): void => {
    const prevLeft = left
    seedLeft(right)
    seedRight(prevLeft)
  }

  const handleClear = (): void => {
    seedLeft('')
    seedRight('')
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-(--color-bg)">
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
          seed={left}
          seedKey={leftKey}
          onCommit={setLeft}
          parsed={leftParsed}
          onFormat={() => handleFormat('left')}
        />
        <PasteBox
          label="Current"
          tone="success"
          seed={right}
          seedKey={rightKey}
          onCommit={setRight}
          parsed={rightParsed}
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
  // External text the editor should display. Typing/pasting does NOT reset the
  // textarea back to `seed` unless `seedKey` signals an explicit toolbar update.
  seed: string
  seedKey: number
  onCommit: (next: string) => void
  parsed: ParseResult
  onFormat: () => void
}

function PasteBox({
  label,
  tone,
  seed,
  seedKey,
  onCommit,
  parsed,
  onFormat
}: PasteBoxProps): ReactElement {
  const toneClass = tone === 'danger' ? 'text-(--color-danger)' : 'text-(--color-success)'
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedRef = useRef(seed)
  const commitTimerRef = useRef<number | null>(null)
  const renderTimerRef = useRef<number | null>(null)
  const renderFrameRef = useRef<number | null>(null)
  const lineStartsRef = useRef<number[]>([])
  if (lineStartsRef.current.length === 0) lineStartsRef.current = buildLineStarts(seed)

  const [bytes, setBytes] = useState(seed.length)
  const [isPending, setIsPending] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [editorHeight, setEditorHeight] = useState(EDITOR_HEIGHT)
  const [highlightReady, setHighlightReady] = useState(true)
  const [renderState, setRenderState] = useState<EditorRenderState>(() =>
    buildEditorRenderState(seed, 0, 0, lineStartsRef.current, EDITOR_HEIGHT)
  )

  useEffect(() => {
    committedRef.current = seed
    const current = textareaRef.current?.value ?? seed
    setBytes(current.length)
    setIsPending(current !== seed)
  }, [seed])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && textarea.value !== seed) textarea.value = seed
    committedRef.current = seed
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
    lineStartsRef.current = buildLineStarts(seed)
    setRenderState(buildEditorRenderState(seed, 0, 0, lineStartsRef.current, editorHeight))
    setHighlightReady(true)
    setBytes(seed.length)
    setIsPending(false)
    // Depend on seedKey only: a key bump is an explicit external update
    // (format/swap/clear), while normal debounced commits should not rewrite the
    // uncontrolled textarea and risk clobbering in-progress typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey])

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current)
      if (renderTimerRef.current !== null) window.clearTimeout(renderTimerRef.current)
      if (renderFrameRef.current !== null) window.cancelAnimationFrame(renderFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const updateHeight = (): void => setEditorHeight(editor.clientHeight || EDITOR_HEIGHT)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(editor)
    return () => observer.disconnect()
  }, [fullscreen])

  const scheduleCommit = (fallback?: string): void => {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current)
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null
      const next = textareaRef.current?.value ?? fallback ?? ''
      startTransition(() => onCommit(next))
    }, COMMIT_DEBOUNCE_MS)
  }

  const syncStatus = (next: string): void => {
    setBytes(next.length)
    setIsPending(next !== committedRef.current)
  }

  const updateRenderState = (text: string, rebuildLineStarts: boolean): void => {
    const textarea = textareaRef.current
    if (rebuildLineStarts) lineStartsRef.current = buildLineStarts(text)
    setRenderState(
      buildEditorRenderState(
        text,
        textarea?.scrollTop ?? 0,
        textarea?.scrollLeft ?? 0,
        lineStartsRef.current,
        editorHeight
      )
    )
    if (rebuildLineStarts) setHighlightReady(true)
  }

  const scheduleRenderUpdate = (fallback?: string, rebuildLineStarts = false): void => {
    if (renderTimerRef.current !== null) window.clearTimeout(renderTimerRef.current)
    if (renderFrameRef.current !== null) window.cancelAnimationFrame(renderFrameRef.current)
    if (rebuildLineStarts) setHighlightReady(false)

    const textLength = fallback?.length ?? textareaRef.current?.value.length ?? 0
    const delay = rebuildLineStarts && textLength > LARGE_RENDER_DELAY_BYTES ? 80 : 0
    const run = (): void => {
      renderTimerRef.current = null
      renderFrameRef.current = window.requestAnimationFrame(() => {
        renderFrameRef.current = null
        const text = textareaRef.current?.value ?? fallback ?? ''
        updateRenderState(text, rebuildLineStarts)
      })
    }

    if (delay > 0) renderTimerRef.current = window.setTimeout(run, delay)
    else run()
  }

  const handleInput = (): void => {
    const next = textareaRef.current?.value ?? ''
    syncStatus(next)
    scheduleCommit(next)
    scheduleRenderUpdate(next, true)
  }

  const handleNativePaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    event.preventDefault()
    const textarea = event.currentTarget
    const pasted = event.clipboardData.getData('text')
    const next =
      textarea.value.slice(0, textarea.selectionStart) +
      pasted +
      textarea.value.slice(textarea.selectionEnd)

    textarea.value = next
    scrollEditorToStart(textarea)
    syncStatus(next)
    scheduleCommit(next)
    scheduleRenderUpdate(next, true)
  }

  const handleScroll = (): void => {
    scheduleRenderUpdate(undefined, false)
  }

  const handleClipboardPaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      const textarea = textareaRef.current
      if (textarea) {
        textarea.value = text
        scrollEditorToStart(textarea)
        textarea.focus()
      }
      syncStatus(text)
      scheduleCommit(text)
      scheduleRenderUpdate(text, true)
    } catch {
      // Clipboard access denied — no-op.
    }
  }

  useEffect(() => {
    scheduleRenderUpdate(undefined, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorHeight])

  const formattable = parsed.isJson && parsed.error === null
  const shikiReady = useShikiReady()
  const canHighlight = highlightReady && renderState.syntaxEnabled && shikiReady
  const shikiLineTokens = useMemo(
    () => (canHighlight ? tokenizeLinesWithShiki(renderState.lines.map((l) => l.text)) : null),
    [canHighlight, renderState.lines]
  )
  const showSyntaxHighlight = canHighlight && shikiLineTokens !== null

  return (
    <div
      className={
        fullscreen
          ? 'absolute inset-0 z-40 flex flex-col min-h-0 bg-(--color-bg) border border-(--color-border)'
          : 'rounded-lg border border-(--color-border) bg-(--color-bg-elev) flex flex-col min-h-0 focus-within:border-(--color-accent)'
      }
    >
      <div className="flex items-center justify-between px-3 h-8 border-b border-(--color-border) shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10.5px] uppercase tracking-wider font-semibold ${toneClass}`}>
            {tone === 'danger' ? '–' : '+'} {label}
          </span>
          <Status parsed={parsed} bytes={bytes} isPending={isPending} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="Paste from clipboard"
            onClick={handleClipboardPaste}
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
          <Button
            variant="ghost"
            size="icon"
            title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <div
        ref={editorRef}
        className={
          fullscreen
            ? 'relative flex-1 min-h-0 overflow-hidden'
            : 'relative h-[220px] overflow-hidden'
        }
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-30 overflow-hidden border-r border-(--color-border) bg-(--color-bg-elev) text-right font-mono text-[11px] text-(--color-fg-subtle)"
          style={{ width: renderState.gutterWidth }}
          aria-hidden="true"
        >
          <div style={{ transform: `translateY(${renderState.topOffset}px)` }}>
            {renderState.lines.map((line) => (
              <div
                key={line.number}
                className="pr-2 select-none"
                style={{ height: EDITOR_LINE_HEIGHT, lineHeight: `${EDITOR_LINE_HEIGHT}px` }}
              >
                {line.number}
              </div>
            ))}
          </div>
        </div>

        {showSyntaxHighlight && (
          <pre
            className="pointer-events-none absolute inset-y-0 right-0 z-30 m-0 overflow-hidden bg-transparent font-mono text-[12px] leading-5"
            style={{ left: renderState.gutterWidth + EDITOR_HORIZONTAL_PADDING }}
            aria-hidden="true"
          >
            <div
              style={{
                transform: `translate(${-renderState.scrollLeft}px, ${renderState.topOffset}px)`,
                tabSize: 2
              }}
            >
              {renderState.lines.map((line, index) => (
                <div
                  key={line.number}
                  className="whitespace-pre"
                  style={{ height: EDITOR_LINE_HEIGHT, lineHeight: `${EDITOR_LINE_HEIGHT}px` }}
                >
                  <HighlightedJsonLine tokens={shikiLineTokens?.[index] ?? []} />
                </div>
              ))}
            </div>
          </pre>
        )}

        <textarea
          key={seedKey}
          ref={textareaRef}
          defaultValue={seed}
          onChange={handleInput}
          onPaste={handleNativePaste}
          onScroll={handleScroll}
          className="relative z-20 h-full w-full resize-none overflow-auto bg-transparent py-2 pr-3 font-mono text-[12px] leading-5 outline-none placeholder:text-(--color-fg-subtle)"
          style={{
            paddingLeft: renderState.gutterWidth + EDITOR_HORIZONTAL_PADDING,
            color: showSyntaxHighlight ? 'transparent' : 'var(--color-fg, #e5e7eb)',
            caretColor: 'var(--color-fg)',
            lineHeight: `${EDITOR_LINE_HEIGHT}px`,
            tabSize: 2
          }}
          placeholder='Paste JSON here, e.g. { "id": 1, "name": "Item" }'
          aria-label={`${label} JSON input`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
        />
      </div>
    </div>
  )
}

function HighlightedJsonLine({ tokens }: { tokens: ThemedToken[] }): ReactElement {
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} style={{ color: token.color }}>
          {token.content}
        </span>
      ))}
    </>
  )
}

function buildLineStarts(text: string): number[] {
  const starts = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1)
  }
  return starts
}

function buildEditorRenderState(
  text: string,
  scrollTop: number,
  scrollLeft: number,
  lineStarts: number[],
  editorHeight: number
): EditorRenderState {
  const lineCount = Math.max(1, lineStarts.length)
  const contentScrollTop = Math.max(0, scrollTop - EDITOR_VERTICAL_PADDING)
  const firstVisibleLine = Math.floor(contentScrollTop / EDITOR_LINE_HEIGHT)
  const startLine = Math.max(0, firstVisibleLine - VISIBLE_LINE_OVERSCAN)
  const visibleLineCount =
    Math.ceil(editorHeight / EDITOR_LINE_HEIGHT) + VISIBLE_LINE_OVERSCAN * 2 + 1
  const endLine = Math.min(lineCount, startLine + visibleLineCount)
  const lines: EditorRenderLine[] = []
  let visibleChars = 0
  let syntaxEnabled = true

  for (let lineIndex = startLine; lineIndex < endLine; lineIndex += 1) {
    const lineStart = lineStarts[lineIndex] ?? 0
    const lineEnd = getLineEnd(text, lineStarts, lineIndex)
    const lineLength = Math.max(0, lineEnd - lineStart)
    visibleChars += lineLength
    if (lineLength > MAX_HIGHLIGHT_LINE_CHARS || visibleChars > MAX_HIGHLIGHT_CHARS) {
      syntaxEnabled = false
    }
    lines.push({
      number: lineIndex + 1,
      text: syntaxEnabled ? text.slice(lineStart, lineEnd) : ''
    })
  }

  return {
    lineCount,
    gutterWidth: Math.max(40, String(lineCount).length * 7 + 22),
    topOffset: EDITOR_VERTICAL_PADDING + startLine * EDITOR_LINE_HEIGHT - scrollTop,
    scrollLeft,
    syntaxEnabled,
    lines
  }
}

function getLineEnd(text: string, lineStarts: number[], lineIndex: number): number {
  const nextLineStart = lineStarts[lineIndex + 1] ?? text.length
  let lineEnd = nextLineStart
  if (lineEnd > 0 && text.charCodeAt(lineEnd - 1) === 10) lineEnd -= 1
  if (lineEnd > 0 && text.charCodeAt(lineEnd - 1) === 13) lineEnd -= 1
  return lineEnd
}

function scrollEditorToStart(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return
  textarea.scrollTop = 0
  textarea.scrollLeft = 0
  textarea.setSelectionRange(0, 0)
}

function Status({
  parsed,
  bytes,
  isPending
}: {
  parsed: ParseResult
  bytes: number
  isPending: boolean
}): ReactElement {
  if (bytes === 0) {
    return <span className="text-[11px] text-(--color-fg-subtle) font-mono">empty</span>
  }
  if (isPending) {
    return (
      <span className="text-[11px] text-(--color-fg-muted) font-mono">
        typing… · {formatBytes(bytes)}
      </span>
    )
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
  return (
    <span className="text-[11px] text-(--color-fg-subtle) font-mono">
      text · {formatBytes(bytes)}
    </span>
  )
}

function parseInput(raw: string): ParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { value: '', error: null, isJson: false }
  // Heuristic: only attempt JSON.parse for inputs that start with one of the
  // JSON structural chars. Otherwise treat as plain text so we don't surface
  // a misleading error for casual string compares.
  const first = trimmed[0]
  const looksLikeJson =
    first === '{' ||
    first === '[' ||
    first === '"' ||
    first === 't' ||
    first === 'f' ||
    first === 'n' ||
    (first >= '0' && first <= '9') ||
    first === '-'
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
