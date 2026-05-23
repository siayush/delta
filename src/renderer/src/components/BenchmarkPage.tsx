import { type ReactElement, useLayoutEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Play, Square, Trash2 } from 'lucide-react'
import { parseDiffFromFile } from '@pierre/diffs'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { JsonView } from './JsonView'
import { JsonDiffView } from './JsonDiffView'
import { api } from '../lib/api'

class CancelledError extends Error {
  constructor() {
    super('cancelled')
    this.name = 'CancelledError'
  }
}

interface RunContext {
  isCancelled: () => boolean
  registerHttp: (requestId: string | null) => void
}

type SizeKey = '1KB' | '10KB' | '100KB' | '1MB' | '5MB'

const SIZES: Array<{ key: SizeKey; recordCount: number }> = [
  { key: '1KB', recordCount: 4 },
  { key: '10KB', recordCount: 40 },
  { key: '100KB', recordCount: 400 },
  { key: '1MB', recordCount: 4000 },
  { key: '5MB', recordCount: 20000 }
]

// Diff parses the full file pair in memory, so above this size we skip it as
// a final safety net. Render is virtualized via CodeView, so even at 5 MB
// only the visible rows are mounted — no need for a render cap.
const MAX_DIFF_BYTES = 20_000_000

type Measure = number | 'skipped'

interface Row {
  size: SizeKey
  bytes: number
  stringifyMs: number
  parseMs: number
  diffMs: Measure
  renderJsonMs: Measure
  renderDiffMs: Measure
  httpMs: number | null
  status: 'pending' | 'running' | 'done' | 'error' | 'cancelled'
  error?: string
}

export function BenchmarkPage(): ReactElement {
  const [url, setUrl] = useState('https://httpbin.org/anything')
  const [running, setRunning] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Record<SizeKey, boolean>>({
    '1KB': true,
    '10KB': true,
    '100KB': true,
    '1MB': true,
    '5MB': false
  })
  const harnessRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef(false)
  const inFlightHttpIdRef = useRef<string | null>(null)

  const handleRun = async (): Promise<void> => {
    if (!harnessRef.current) return
    cancelRef.current = false
    setRunning(true)
    const queue = SIZES.filter((s) => selected[s.key])
    setRows(
      queue.map((s) => ({
        size: s.key,
        bytes: 0,
        stringifyMs: 0,
        parseMs: 0,
        diffMs: 0,
        renderJsonMs: 0,
        renderDiffMs: 0,
        httpMs: null,
        status: 'pending'
      }))
    )

    const ctx: RunContext = {
      isCancelled: () => cancelRef.current,
      registerHttp: (id) => {
        inFlightHttpIdRef.current = id
      }
    }

    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) {
        setRows((prev) =>
          prev.map((r, idx) => (idx >= i ? { ...r, status: 'cancelled' } : r))
        )
        break
      }
      const cfg = queue[i]
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'running' } : r)))
      try {
        const result = await runOne(cfg, harnessRef.current!, url.trim() || null, ctx)
        setRows((prev) => prev.map((r, idx) => (idx === i ? result : r)))
      } catch (e) {
        if (e instanceof CancelledError || cancelRef.current) {
          setRows((prev) =>
            prev.map((r, idx) => (idx >= i ? { ...r, status: 'cancelled' } : r))
          )
          break
        }
        const message = e instanceof Error ? e.message : String(e)
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'error', error: message } : r))
        )
      }
      // Yield to the event loop so the UI stays responsive between runs.
      await new Promise((r) => setTimeout(r, 50))
    }
    inFlightHttpIdRef.current = null
    setRunning(false)
  }

  const handleCancel = (): void => {
    cancelRef.current = true
    const id = inFlightHttpIdRef.current
    if (id) void api.http.cancel(id)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-7">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-[18px] font-semibold">Benchmark</h2>
          <span className="text-[11px] text-(--color-fg-subtle) font-mono">
            measure request, parse, diff & render
          </span>
        </div>
        <p className="text-[12.5px] text-(--color-fg-muted) mb-4">
          Generates synthetic JSON payloads at the selected sizes, then measures how long Delta
          takes to stringify, parse, diff, and render them. Optionally sends each payload to a URL
          to measure end-to-end HTTP roundtrip. Render uses Pierre&apos;s virtualized CodeView, so
          only visible rows are mounted. Diff compute is skipped above 20&nbsp;MB.
        </p>

        <div className="rounded-lg border border-(--color-border) bg-(--color-bg-elev) p-4 mb-4">
          <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold block mb-1.5">
            HTTP echo URL (optional)
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://httpbin.org/anything"
            disabled={running}
          />
          <p className="text-[11px] text-(--color-fg-subtle) mt-1.5">
            Leave blank to skip the HTTP test. Endpoint must accept a POST with a JSON body.
          </p>

          <div className="mt-4">
            <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold block mb-1.5">
              Sizes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  disabled={running}
                  onClick={() => setSelected((sel) => ({ ...sel, [s.key]: !sel[s.key] }))}
                  className={`h-7 px-2.5 rounded-md text-[12px] border ${
                    selected[s.key]
                      ? 'bg-(--color-accent) text-(--color-accent-fg) border-transparent'
                      : 'border-(--color-border) text-(--color-fg-muted)'
                  } disabled:opacity-50`}
                >
                  {s.key}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleRun} disabled={running}>
              <Play className="h-3.5 w-3.5" />
              {running ? 'Running…' : 'Run benchmark'}
            </Button>
            {running && (
              <Button variant="danger" onClick={handleCancel}>
                <Square className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setRows([])}
              disabled={running || rows.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>

        {rows.length > 0 && <ResultsTable rows={rows} hasUrl={Boolean(url.trim())} />}

        {/* Hidden mount target for measuring component render time. */}
        <div
          ref={harnessRef}
          aria-hidden
          style={{ position: 'fixed', left: -99999, top: 0, width: 800, height: 600 }}
        />
      </div>
    </div>
  )
}

function ResultsTable({ rows, hasUrl }: { rows: Row[]; hasUrl: boolean }): ReactElement {
  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-elev) overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-(--color-bg) text-(--color-fg-muted)">
          <tr className="text-left">
            <Th>Size</Th>
            <Th>Bytes</Th>
            <Th>Stringify</Th>
            <Th>Parse</Th>
            <Th>Diff</Th>
            <Th>Render JSON</Th>
            <Th>Render Diff</Th>
            {hasUrl && <Th>HTTP</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size} className="border-t border-(--color-border)">
              <Td>{r.size}</Td>
              <Td>
                {r.status === 'pending'
                  ? '—'
                  : r.status === 'cancelled' && r.bytes === 0
                    ? 'cancelled'
                    : formatBytes(r.bytes)}
              </Td>
              <Td>{cell(r, 'stringifyMs')}</Td>
              <Td>{cell(r, 'parseMs')}</Td>
              <Td>{cell(r, 'diffMs')}</Td>
              <Td>{cell(r, 'renderJsonMs')}</Td>
              <Td>{cell(r, 'renderDiffMs')}</Td>
              {hasUrl && <Td>{r.httpMs == null ? '—' : `${r.httpMs} ms`}</Td>}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((r) => r.error) && (
        <div className="px-3 py-2 border-t border-(--color-border) text-[11.5px] text-(--color-danger)">
          {rows
            .filter((r) => r.error)
            .map((r) => `${r.size}: ${r.error}`)
            .join(' · ')}
        </div>
      )}
    </div>
  )
}

function cell(
  r: Row,
  key: 'stringifyMs' | 'parseMs' | 'diffMs' | 'renderJsonMs' | 'renderDiffMs'
): string {
  if (r.status === 'pending') return '—'
  if (r.status === 'running') return '…'
  if (r.status === 'error') return '—'
  if (r.status === 'cancelled') return '—'
  const v = r[key]
  if (v === 'skipped') return 'skipped'
  return `${v.toFixed(1)} ms`
}

function Th({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">{children}</th>
  )
}

function Td({ children }: { children: React.ReactNode }): ReactElement {
  return <td className="px-3 py-2 font-mono">{children}</td>
}

async function runOne(
  cfg: { key: SizeKey; recordCount: number },
  harness: HTMLDivElement,
  url: string | null,
  ctx: RunContext
): Promise<Row> {
  const checkpoint = async (): Promise<void> => {
    await yieldToBrowser()
    if (ctx.isCancelled()) throw new CancelledError()
  }

  const before = generatePayload(cfg.recordCount, 0)
  const after = generatePayload(cfg.recordCount, 0.05)

  const t1 = performance.now()
  const beforeStr = JSON.stringify(before)
  const afterStr = JSON.stringify(after)
  const stringifyMs = performance.now() - t1
  await checkpoint()

  const t2 = performance.now()
  JSON.parse(beforeStr)
  JSON.parse(afterStr)
  const parseMs = performance.now() - t2
  await checkpoint()

  const bytes = beforeStr.length
  let diffMs: Measure = 'skipped'
  if (bytes <= MAX_DIFF_BYTES) {
    const t3 = performance.now()
    parseDiffFromFile(
      { name: 'baseline.json', contents: beforeStr },
      { name: 'current.json', contents: afterStr }
    )
    diffMs = performance.now() - t3
    await checkpoint()
  }

  const renderJsonMs: Measure = await measureRender(harness, <JsonView data={after} />)
  await checkpoint()
  const renderDiffMs: Measure =
    bytes <= MAX_DIFF_BYTES
      ? await measureRender(harness, <JsonDiffView before={before} after={after} />)
      : 'skipped'
  await checkpoint()

  let httpMs: number | null = null
  if (url) {
    const requestId = `bench-${cfg.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    ctx.registerHttp(requestId)
    try {
      const res = await api.http.send({
        method: 'POST',
        url,
        headers: { 'content-type': 'application/json' },
        queryParams: {},
        body: beforeStr,
        timeoutMs: 60_000,
        requestId
      })
      httpMs = res.responseTime
    } finally {
      ctx.registerHttp(null)
    }
    if (ctx.isCancelled()) throw new CancelledError()
  }

  return {
    size: cfg.key,
    bytes,
    stringifyMs,
    parseMs,
    diffMs,
    renderJsonMs,
    renderDiffMs,
    httpMs,
    status: 'done'
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function CommitProbe({ onCommit }: { onCommit: () => void }): null {
  useLayoutEffect(() => {
    onCommit()
  }, [onCommit])
  return null
}

async function measureRender(host: HTMLDivElement, node: React.ReactElement): Promise<number> {
  const div = document.createElement('div')
  host.appendChild(div)
  const root: Root = createRoot(div)
  return new Promise<number>((resolve) => {
    const start = performance.now()
    let committed = false
    root.render(
      <>
        {node}
        <CommitProbe
          onCommit={() => {
            if (committed) return
            committed = true
            const elapsed = performance.now() - start
            // Wait one frame so paint cost is included, then resolve.
            requestAnimationFrame(() => {
              const total = performance.now() - start
              root.unmount()
              div.remove()
              // Use the post-paint number; it captures layout + paint.
              resolve(total > elapsed ? total : elapsed)
            })
          }}
        />
      </>
    )
  })
}

function generatePayload(records: number, mutationRate: number): unknown {
  // Deterministic seed-ish generator so before/after share most content.
  const rand = mulberry32(records)
  const items: Record<string, unknown>[] = []
  for (let i = 0; i < records; i++) {
    const mutate = mutationRate > 0 && rand() < mutationRate
    items.push({
      id: `item-${i}`,
      sku: `SKU-${(10000 + i).toString(36).toUpperCase()}`,
      name: `Item ${i}${mutate ? ' (updated)' : ''}`,
      price: round2((20 + i * 0.07) * (mutate ? 1.1 : 1)),
      currency: 'USD',
      inStock: i % 5 !== 0,
      tags: ['featured', 'sale', mutate ? 'updated' : 'standard', `cat-${i % 12}`],
      metadata: {
        createdAt: 1700000000 + i * 60,
        updatedAt: 1710000000 + i * 60 + (mutate ? 1000 : 0),
        ratings: {
          count: 100 + i,
          avg: round2(3 + (i % 20) / 10),
          breakdown: { 5: 50 + i, 4: 30, 3: 10, 2: 5, 1: 5 }
        }
      },
      description:
        'A reasonably-long product description so the payload reaches a realistic byte count. ' +
        'It includes prose, numbers, and structure that resembles a typical API response.'
    })
  }
  return { ok: true, count: records, items }
}

function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
