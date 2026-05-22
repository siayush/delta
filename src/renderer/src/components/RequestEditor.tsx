import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { ApiRequest, HttpMethod } from '@shared/types'
import { Input } from './ui/Input'
import { useUpdateRequest } from '../queries/requests'
import { useSendRequest, useCancelRequest } from '../queries/http'
import { useResponseStore } from '../stores/response'
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
  const update = useUpdateRequest()
  const send = useSendRequest()
  const cancel = useCancelRequest()
  const setResponse = useResponseStore((s) => s.setResponse)
  const { data: environments = [] } = useEnvironments()
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)
  const env = environments.find((e) => e.id === activeEnvId) ?? null

  const [local, setLocal] = useState(request)
  const [tab, setTab] = useState<Tab>('Params')
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ID of the in-flight send so the Cancel button can target the right request.
  const inFlightId = useRef<string | null>(null)

  useEffect(() => {
    setLocal(request)
    setError(null)
  }, [request.id])

  // Debounced auto-save: edits in the renderer flush to the main process
  // SQLite after 400ms of inactivity, with a flush on unmount.
  const queueSave = (patch: ApiRequest): void => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      update.mutate({
        id: patch.id,
        patch: {
          name: patch.name,
          method: patch.method,
          url: patch.url,
          headers: patch.headers,
          queryParams: patch.queryParams,
          body: patch.body,
          folderId: patch.folderId
        }
      })
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        update.mutate({ id: local.id, patch: local })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (changes: Partial<ApiRequest>): void => {
    const next = { ...local, ...changes }
    setLocal(next)
    queueSave(next)
  }

  const handleSend = async (): Promise<void> => {
    setError(null)
    const requestId = crypto.randomUUID()
    inFlightId.current = requestId
    try {
      const finalUrl = applyEnvironment(local.url, env)
      const resolvedHeaders = Object.fromEntries(
        Object.entries(local.headers).map(([k, v]) => [k, resolveVariables(v, env)])
      )
      const resolvedParams = Object.fromEntries(
        Object.entries(local.queryParams).map(([k, v]) => [k, resolveVariables(v, env)])
      )
      const response = await send.mutateAsync({
        requestId,
        method: local.method,
        url: finalUrl,
        headers: resolvedHeaders,
        queryParams: resolvedParams,
        body: resolveVariables(local.body, env)
      })
      setResponse(local.id, response)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setResponse(local.id, null)
    } finally {
      inFlightId.current = null
    }
  }

  const handleCancel = (): void => {
    const id = inFlightId.current
    if (!id) return
    cancel.mutate(id)
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
                'appearance-none h-full pl-3 pr-7 bg-transparent border-0 outline-none focus:outline-none text-[11.5px] font-mono font-bold cursor-pointer',
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
          {send.isPending ? (
            <button
              onClick={handleCancel}
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
        <div className="flex gap-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'py-1.5 px-1 text-[11.5px] font-medium border-b-2 -mb-px transition-colors',
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

function KeyValueEditor({ entries, onChange, placeholder }: KvProps) {
  const rows = Object.entries(entries)
  const update = (idx: number, key: string, value: string): void => {
    const next: Record<string, string> = {}
    rows.forEach(([k, v], i) => {
      if (i === idx) next[key] = value
      else next[k] = v
    })
    onChange(next)
  }
  const remove = (idx: number): void => {
    const next: Record<string, string> = {}
    rows.forEach(([k, v], i) => {
      if (i !== idx) next[k] = v
    })
    onChange(next)
  }
  const add = (): void => onChange({ ...entries, '': '' })

  const displayRows: Array<[string, string] | null> = rows.length === 0 ? [null] : rows

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-(--color-border) overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_28px] bg-(--color-bg-elev)/60 border-b border-(--color-border) text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-medium">
          <div className="px-2.5 py-1.5">{placeholder.key}</div>
          <div className="px-2.5 py-1.5 border-l border-(--color-border)">{placeholder.value}</div>
          <div className="border-l border-(--color-border)" />
        </div>
        {displayRows.map((row, idx) => {
          const k = row ? row[0] : ''
          const v = row ? row[1] : ''
          const isPlaceholder = row === null
          return (
            <div
              key={idx}
              className="grid grid-cols-[1fr_1fr_28px] border-t border-(--color-border) first:border-t-0"
            >
              <input
                value={k}
                placeholder={placeholder.key}
                onChange={(e) => (isPlaceholder ? add() : update(idx, e.target.value, v))}
                onFocus={() => {
                  if (isPlaceholder) add()
                }}
                className="h-7 px-2.5 bg-transparent border-0 outline-none text-[12px] font-mono placeholder:text-(--color-fg-subtle)"
              />
              <input
                value={v}
                placeholder={placeholder.value}
                onChange={(e) => (isPlaceholder ? add() : update(idx, k, e.target.value))}
                onFocus={() => {
                  if (isPlaceholder) add()
                }}
                className="h-7 px-2.5 bg-transparent border-0 border-l border-(--color-border) outline-none text-[12px] font-mono placeholder:text-(--color-fg-subtle)"
              />
              <button
                onClick={() => !isPlaceholder && remove(idx)}
                disabled={isPlaceholder}
                title="Remove"
                className="border-l border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) hover:bg-(--color-bg-hover) disabled:opacity-30 disabled:hover:bg-transparent text-[14px] leading-none cursor-pointer disabled:cursor-default"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={add}
        className="text-[11.5px] text-(--color-fg-muted) hover:text-(--color-fg) cursor-pointer"
      >
        + Add row
      </button>
    </div>
  )
}
