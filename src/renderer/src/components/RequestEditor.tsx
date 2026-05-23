import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { ApiRequest, HttpMethod } from '@shared/types'
import { Input } from './ui/Input'
import { useDraftStore } from '../stores/drafts'
import { useIsPending, useRequestRuntime, useSendError } from '../stores/requestRuntime'
import { useEnvironments } from '../queries/environments'
import { useUiStore } from '../stores/ui'
import { applyEnvironment, resolveVariables } from '../lib/environment'
import { cn } from '../lib/utils'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const TABS = ['Headers', 'Params', 'Body'] as const
type Tab = (typeof TABS)[number]

interface Props {
  request: ApiRequest
}

export function RequestEditor({ request }: Props) {
  const ensureDraft = useDraftStore((s) => s.ensure)
  const patchDraft = useDraftStore((s) => s.patch)
  const local = useDraftStore((s) => s.byRequestId[request.id]) ?? request

  // Seed the draft store the first time we see this request id. ensure() is
  // idempotent; we deliberately key on id (not the object) so cache reference
  // churn from each keystroke doesn't re-fire the effect.
  useEffect(() => {
    ensureDraft(request)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id])

  const isPending = useIsPending(request.id)
  const error = useSendError(request.id)
  const startSend = useRequestRuntime((s) => s.startSend)
  const cancel = useRequestRuntime((s) => s.cancel)

  const { data: environments = [] } = useEnvironments()
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)
  const env = environments.find((e) => e.id === activeEnvId) ?? null

  const [tab, setTab] = useState<Tab>('Params')

  const patch = (changes: Partial<ApiRequest>): void => {
    patchDraft(request.id, changes)
  }

  const handleSend = (): void => {
    // startSend's initial state set clears any prior error — no extra call needed.
    const finalUrl = applyEnvironment(local.url, env)
    const resolvedHeaders = Object.fromEntries(
      Object.entries(local.headers).map(([k, v]) => [k, resolveVariables(v, env)])
    )
    const resolvedParams = Object.fromEntries(
      Object.entries(local.queryParams).map(([k, v]) => [k, resolveVariables(v, env)])
    )
    void startSend(request.id, {
      method: local.method,
      url: finalUrl,
      headers: resolvedHeaders,
      queryParams: resolvedParams,
      body: resolveVariables(local.body, env)
    })
  }

  return (
    <div className="border-b border-(--color-border) bg-(--color-bg)">
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2">
        <Input
          value={local.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Request name"
          className="border-transparent bg-transparent hover:bg-(--color-bg-elev) px-1.5 font-semibold text-[13.5px] h-6"
        />
        <div
          className={cn(
            'flex items-stretch h-8 rounded-md border border-(--color-border) bg-(--color-bg-elev) overflow-hidden',
            'focus-within:border-(--color-accent)'
          )}
        >
          <div className="relative flex items-center">
            <select
              value={local.method}
              onChange={(e) => patch({ method: e.target.value as HttpMethod })}
              className={cn(
                'appearance-none h-full pl-3 pr-7 bg-transparent border-0 outline-none focus:outline-none text-[12px] font-mono font-bold cursor-pointer',
                `method-${local.method}`
              )}
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-(--color-bg-elev) text-(--color-fg)">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2 h-3 w-3 pointer-events-none text-(--color-fg-muted)"
              aria-hidden
            />
          </div>
          <div className="w-px self-stretch bg-(--color-border)" />
          <input
            placeholder={env?.baseUrl ? `${env.baseUrl}/path or full URL` : 'https://...'}
            value={local.url}
            onChange={(e) => patch({ url: e.target.value })}
            className="flex-1 min-w-0 h-full px-3 bg-transparent border-0 outline-none focus:outline-none text-[12.5px] font-mono placeholder:text-(--color-fg-subtle)"
          />
          {isPending ? (
            <button
              onClick={() => cancel(request.id)}
              className={cn(
                'h-full px-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold',
                'bg-(--color-danger) text-white',
                'hover:opacity-90 cursor-pointer'
              )}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!local.url}
              className={cn(
                'h-full px-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold',
                'bg-(--color-accent) text-(--color-accent-fg)',
                'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
              )}
            >
              Send
            </button>
          )}
        </div>
        {error && (
          <div className="text-[12px] text-(--color-danger) bg-(--color-danger)/10 border border-(--color-danger)/30 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-(--color-border) px-3">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'h-9 px-3 text-[12px] font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-(--color-accent) text-(--color-fg)'
                  : 'border-transparent text-(--color-fg-muted) hover:text-(--color-fg)'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2.5 max-h-64 overflow-auto">
        {tab === 'Headers' && (
          <KeyValueEditor
            entries={local.headers}
            onChange={(headers) => patch({ headers })}
            placeholder={{ key: 'Header', value: 'Value' }}
          />
        )}
        {tab === 'Params' && (
          <KeyValueEditor
            entries={local.queryParams}
            onChange={(queryParams) => patch({ queryParams })}
            placeholder={{ key: 'Param', value: 'Value' }}
          />
        )}
        {tab === 'Body' && (
          <textarea
            value={local.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder='{"key": "value"}'
            className="w-full h-44 rounded-md border border-(--color-border) bg-(--color-bg-elev) p-2 text-[12.5px] font-mono outline-none focus:border-(--color-accent) resize-none"
          />
        )}
      </div>
    </div>
  )
}

interface KvProps {
  entries: Record<string, string>
  onChange: (next: Record<string, string>) => void
  placeholder: { key: string; value: string }
}

interface Row {
  id: string
  key: string
  value: string
}

const newRowId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const entriesToRows = (entries: Record<string, string>): Row[] =>
  Object.entries(entries).map(([key, value]) => ({ id: newRowId(), key, value }))

const rowsToEntries = (rows: Row[]): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.key === '') continue
    out[r.key] = r.value
  }
  return out
}

const rowsMatch = (rows: Row[], entries: Record<string, string>): boolean => {
  const kept = rows.filter((r) => r.key !== '')
  const keys = Object.keys(entries)
  if (kept.length !== keys.length) return false
  return kept.every((r) => entries[r.key] === r.value)
}

function KeyValueEditor({ entries, onChange, placeholder }: KvProps) {
  const [rows, setRows] = useState<Row[]>(() => entriesToRows(entries))
  const pendingFocusRef = useRef<string | null>(null)

  // Re-sync when the parent swaps in a different set of entries (e.g. switching requests),
  // but ignore prop updates that just echo what we already emitted.
  useEffect(() => {
    if (!rowsMatch(rows, entries)) {
      setRows(entriesToRows(entries))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const commit = (next: Row[]): void => {
    setRows(next)
    onChange(rowsToEntries(next))
  }

  const update = (id: string, key: string, value: string): void => {
    commit(rows.map((r) => (r.id === id ? { ...r, key, value } : r)))
  }
  const remove = (id: string): void => {
    commit(rows.filter((r) => r.id !== id))
  }
  const add = (): void => {
    const id = newRowId()
    pendingFocusRef.current = id
    commit([...rows, { id, key: '', value: '' }])
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-(--color-border) overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_28px] bg-(--color-bg-elev)/60 border-b border-(--color-border) text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-medium">
          <div className="px-2.5 py-1.5">{placeholder.key}</div>
          <div className="px-2.5 py-1.5 border-l border-(--color-border)">{placeholder.value}</div>
          <div className="border-l border-(--color-border)" />
        </div>
        {rows.length === 0 && (
          <div className="px-2.5 py-2 text-[12px] text-(--color-fg-subtle)">
            No {placeholder.key.toLowerCase()}s. Click + Add row to add one.
          </div>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_1fr_28px] border-t border-(--color-border) first:border-t-0"
          >
            <input
              ref={(el) => {
                if (el && pendingFocusRef.current === row.id) {
                  el.focus()
                  pendingFocusRef.current = null
                }
              }}
              value={row.key}
              placeholder={placeholder.key}
              onChange={(e) => update(row.id, e.target.value, row.value)}
              className="kv-cell h-7 px-2.5 bg-transparent border-0 text-[12px] font-mono placeholder:text-(--color-fg-subtle)"
            />
            <input
              value={row.value}
              placeholder={placeholder.value}
              onChange={(e) => update(row.id, row.key, e.target.value)}
              className="kv-cell h-7 px-2.5 bg-transparent border-0 border-l border-(--color-border) text-[12px] font-mono placeholder:text-(--color-fg-subtle)"
            />
            <button
              onClick={() => remove(row.id)}
              title="Remove"
              className="border-l border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) hover:bg-(--color-bg-hover) text-[14px] leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="text-[12px] text-(--color-fg-muted) hover:text-(--color-fg) cursor-pointer"
      >
        + Add row
      </button>
    </div>
  )
}
