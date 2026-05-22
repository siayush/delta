import { useEffect, useRef, useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { ApiRequest, HttpMethod } from '@shared/types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useUpdateRequest } from '../queries/requests'
import { useSendRequest } from '../queries/http'
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
  const setResponse = useResponseStore((s) => s.setResponse)
  const { data: environments = [] } = useEnvironments()
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)
  const env = environments.find((e) => e.id === activeEnvId) ?? null

  const [local, setLocal] = useState(request)
  const [tab, setTab] = useState<Tab>('Params')
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    try {
      const finalUrl = applyEnvironment(local.url, env)
      const resolvedHeaders = Object.fromEntries(
        Object.entries(local.headers).map(([k, v]) => [k, resolveVariables(v, env)])
      )
      const resolvedParams = Object.fromEntries(
        Object.entries(local.queryParams).map(([k, v]) => [k, resolveVariables(v, env)])
      )
      const response = await send.mutateAsync({
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
    }
  }

  return (
    <div className="border-b border-(--color-border) bg-(--color-bg)">
      <div className="px-4 py-3 flex flex-col gap-3">
        <Input
          value={local.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Request name"
          className="border-transparent bg-transparent hover:bg-(--color-bg-elev) px-2 font-semibold text-[14px] h-7"
        />
        <div className="flex items-center gap-2">
          <select
            value={local.method}
            onChange={(e) => patch({ method: e.target.value as HttpMethod })}
            className={cn(
              'h-8 px-2 rounded-md border border-(--color-border) bg-(--color-bg-elev) text-[12px] font-mono font-bold',
              `method-${local.method}`
            )}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Input
            placeholder={env?.baseUrl ? `${env.baseUrl}/path or full URL` : 'https://...'}
            value={local.url}
            onChange={(e) => patch({ url: e.target.value })}
            className="font-mono"
          />
          <Button onClick={handleSend} disabled={send.isPending || !local.url}>
            {send.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </div>
        {error && (
          <div className="text-[12px] text-(--color-danger) bg-(--color-danger)/10 border border-(--color-danger)/30 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-(--color-border) px-4">
        <div className="flex gap-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'py-2 text-[12px] border-b-2 -mb-px',
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

      <div className="px-4 py-3 max-h-64 overflow-auto">
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

  return (
    <div className="space-y-1.5">
      {rows.length === 0 && (
        <div className="text-[12px] text-(--color-fg-muted) py-2">No {placeholder.key.toLowerCase()}s yet.</div>
      )}
      {rows.map(([k, v], idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={k}
            placeholder={placeholder.key}
            onChange={(e) => update(idx, e.target.value, v)}
            className="font-mono"
          />
          <Input
            value={v}
            placeholder={placeholder.value}
            onChange={(e) => update(idx, k, e.target.value)}
            className="font-mono"
          />
          <Button variant="ghost" size="icon" onClick={() => remove(idx)} title="Remove">
            ×
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}>
        + Add row
      </Button>
    </div>
  )
}
