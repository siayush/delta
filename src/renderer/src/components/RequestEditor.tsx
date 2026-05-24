import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type {
  ApiRequest,
  Environment,
  HttpMethod,
  KvEntry,
  RequestAuth,
  RequestAuthType
} from '@shared/types'
import { Input } from './ui/Input'
import { useDraftStore } from '../stores/drafts'
import { useIsPending, useRequestRuntime, useSendError } from '../stores/requestRuntime'
import { useEnvironments } from '../queries/environments'
import { useUiStore } from '../stores/ui'
import { applyEnvironment, resolveVariables } from '../lib/environment'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { JsonBodyEditor } from './JsonBodyEditor'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const TABS = ['Headers', 'Params', 'Body', 'Auth'] as const
type Tab = (typeof TABS)[number]

interface Props {
  request: ApiRequest
}

export function RequestEditor({ request }: Props): ReactElement {
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

  // The URL field shows the bare URL plus enabled query params. We keep a
  // local input buffer so that what the user types stays verbatim (including
  // partial states like a trailing `&`) instead of being lossily re-derived
  // from the params list on every keystroke. The buffer only refreshes from
  // params when the change originated outside this field (Params tab edit,
  // switching requests, etc).
  const [urlInput, setUrlInput] = useState(() => composeUrl(local.url, local.queryParams))
  const userEditingUrlRef = useRef(false)
  useEffect(() => {
    if (userEditingUrlRef.current) {
      userEditingUrlRef.current = false
      return
    }
    setUrlInput(composeUrl(local.url, local.queryParams))
  }, [local.url, local.queryParams])

  const handleUrlChange = (next: string): void => {
    userEditingUrlRef.current = true
    setUrlInput(next)
    const { base, params: parsed } = decomposeUrl(next)
    // Preserve disabled rows untouched; rewrite enabled rows to mirror the URL.
    const disabled = local.queryParams.filter((q) => !q.enabled)
    patch({ url: base, queryParams: [...disabled, ...parsed] })
  }

  // Intercept a cURL paste in the URL bar and treat it as an inline import —
  // saves the user from opening the modal just because they copied a curl
  // command from devtools.
  const handleUrlPaste = async (e: React.ClipboardEvent<HTMLInputElement>): Promise<void> => {
    const pasted = e.clipboardData.getData('text')
    if (!/^\s*curl[\s'"]/i.test(pasted)) return
    e.preventDefault()
    try {
      const parsed = await api.app.parseCurl(pasted)
      patch({
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        queryParams: parsed.queryParams,
        body: parsed.body,
        auth: parsed.auth
      })
    } catch {
      // Parsing failed — fall back to the literal paste so the user doesn't
      // lose what they had on the clipboard.
      handleUrlChange(pasted)
    }
  }

  const handleSend = (): void => {
    // startSend's initial state set clears any prior error — no extra call needed.
    const finalUrl = applyEnvironment(local.url, env)
    const resolvedHeaders = entriesToRecord(local.headers, env)
    const resolvedParams = entriesToRecord(local.queryParams, env)
    // Materialize the configured auth into an Authorization header at send
    // time. User-typed Authorization headers still win — we only set ours
    // when the field is empty.
    const authHeader = buildAuthHeader(local.auth, env)
    const finalHeaders = authHeader
      ? { Authorization: authHeader, ...resolvedHeaders }
      : resolvedHeaders
    void startSend(request.id, {
      method: local.method,
      url: finalUrl,
      headers: finalHeaders,
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
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            onPaste={(e) => void handleUrlPaste(e)}
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
          <JsonBodyEditor
            value={local.body}
            onChange={(body) => patch({ body })}
            placeholder='{"key": "value"}'
          />
        )}
        {tab === 'Auth' && <AuthEditor auth={local.auth} onChange={(auth) => patch({ auth })} />}
      </div>
    </div>
  )
}

const AUTH_TYPES: { value: RequestAuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' }
]

function AuthEditor({
  auth,
  onChange
}: {
  auth: RequestAuth
  onChange: (next: RequestAuth) => void
}): ReactElement {
  const set = (patch: Partial<RequestAuth>): void => onChange({ ...auth, ...patch })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold w-16">
          Type
        </label>
        <div className="relative">
          <select
            value={auth.type}
            onChange={(e) => set({ type: e.target.value as RequestAuthType })}
            className="appearance-none h-7 pl-2.5 pr-7 rounded-md border border-(--color-border) bg-(--color-bg-elev) text-[12px] outline-none focus:border-(--color-accent) cursor-pointer"
          >
            {AUTH_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-(--color-fg-muted)"
            aria-hidden
          />
        </div>
      </div>

      {auth.type === 'none' && (
        <div className="text-[12px] text-(--color-fg-muted)">
          No authorization will be sent. Switch to Bearer or Basic to add an Authorization header.
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold w-16">
            Token
          </label>
          <Input
            value={auth.token}
            onChange={(e) => set({ token: e.target.value })}
            placeholder="eyJhbGciOi… or {{token}}"
            spellCheck={false}
            className="font-mono"
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold w-16">
              Username
            </label>
            <Input
              value={auth.username}
              onChange={(e) => set({ username: e.target.value })}
              placeholder="username"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold w-16">
              Password
            </label>
            <Input
              type="password"
              value={auth.password}
              onChange={(e) => set({ password: e.target.value })}
              placeholder="password"
              spellCheck={false}
              className="font-mono"
            />
          </div>
        </>
      )}
    </div>
  )
}

function buildAuthHeader(auth: RequestAuth, env: Environment | null): string | null {
  if (auth.type === 'bearer') {
    const token = resolveVariables(auth.token, env).trim()
    return token ? `Bearer ${token}` : null
  }
  if (auth.type === 'basic') {
    const user = resolveVariables(auth.username, env)
    const pass = resolveVariables(auth.password, env)
    if (!user && !pass) return null
    return `Basic ${btoa(`${user}:${pass}`)}`
  }
  return null
}

// Pass-through compose/decompose: the URL field and the Params tab share the
// same plain-text values. We deliberately don't URL-encode here — the actual
// HTTP send path (URLSearchParams in main/ipc/http.ts) handles encoding once,
// at the network boundary. Encoding here would cause a round-trip escalation
// while the user is typing partial escape sequences like `%2`.
function composeUrl(base: string, params: KvEntry[]): string {
  const enabled = params.filter((p) => p.enabled && (p.key !== '' || p.value !== ''))
  if (enabled.length === 0) return base
  const qIdx = base.indexOf('?')
  const root = qIdx >= 0 ? base.slice(0, qIdx) : base
  // Emit `key=value` when there's a value, otherwise just `key`. This keeps
  // round-tripping with the URL bar honest: typing `&n` shouldn't have an `=`
  // inserted behind your cursor.
  const qs = enabled.map((p) => (p.value !== '' ? `${p.key}=${p.value}` : p.key)).join('&')
  return `${root}?${qs}`
}

function decomposeUrl(full: string): { base: string; params: KvEntry[] } {
  const qIdx = full.indexOf('?')
  if (qIdx < 0) return { base: full, params: [] }
  const base = full.slice(0, qIdx)
  const qs = full.slice(qIdx + 1)
  if (qs === '') return { base, params: [] }
  const params: KvEntry[] = []
  for (const chunk of qs.split('&')) {
    const eq = chunk.indexOf('=')
    const key = eq >= 0 ? chunk.slice(0, eq) : chunk
    const value = eq >= 0 ? chunk.slice(eq + 1) : ''
    params.push({ key, value, enabled: true })
  }
  return { base, params }
}

function entriesToRecord(entries: KvEntry[], env: Environment | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of entries) {
    if (!e.enabled) continue
    if (e.key.trim() === '') continue
    out[e.key] = resolveVariables(e.value, env)
  }
  return out
}

interface KvProps {
  entries: KvEntry[]
  onChange: (next: KvEntry[]) => void
  placeholder: { key: string; value: string }
}

interface Row {
  id: string
  key: string
  value: string
  enabled: boolean
}

const newRowId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const entriesToRows = (entries: KvEntry[]): Row[] =>
  entries.map((e) => ({ id: newRowId(), key: e.key, value: e.value, enabled: e.enabled }))

const rowsToEntries = (rows: Row[]): KvEntry[] =>
  rows
    .filter((r) => r.key !== '' || r.value !== '')
    .map((r) => ({ key: r.key, value: r.value, enabled: r.enabled }))

const rowsMatch = (rows: Row[], entries: KvEntry[]): boolean => {
  const collapsed = rowsToEntries(rows)
  if (collapsed.length !== entries.length) return false
  return collapsed.every(
    (r, i) =>
      r.key === entries[i].key && r.value === entries[i].value && r.enabled === entries[i].enabled
  )
}

function KeyValueEditor({ entries, onChange, placeholder }: KvProps): ReactElement {
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

  const updateField = (id: string, patch: Partial<Row>): void => {
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const remove = (id: string): void => {
    commit(rows.filter((r) => r.id !== id))
  }
  const add = (): void => {
    const id = newRowId()
    pendingFocusRef.current = id
    commit([...rows, { id, key: '', value: '', enabled: true }])
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-(--color-border) overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_1fr_28px] bg-(--color-bg-elev)/60 border-b border-(--color-border) text-[10.5px] uppercase tracking-wider text-(--color-fg-subtle) font-medium">
          <div />
          <div className="px-2.5 py-1.5 border-l border-(--color-border)">{placeholder.key}</div>
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
            className={cn(
              'grid grid-cols-[28px_1fr_1fr_28px] border-t border-(--color-border) first:border-t-0',
              !row.enabled && 'opacity-50'
            )}
          >
            <label
              className="flex items-center justify-center cursor-pointer"
              title={row.enabled ? 'Disable row' : 'Enable row'}
            >
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => updateField(row.id, { enabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-(--color-accent) cursor-pointer"
              />
            </label>
            <input
              ref={(el) => {
                if (el && pendingFocusRef.current === row.id) {
                  el.focus()
                  pendingFocusRef.current = null
                }
              }}
              value={row.key}
              placeholder={placeholder.key}
              onChange={(e) => updateField(row.id, { key: e.target.value })}
              className="kv-cell h-7 px-2.5 bg-transparent border-0 border-l border-(--color-border) text-[12px] font-mono placeholder:text-(--color-fg-subtle)"
            />
            <input
              value={row.value}
              placeholder={placeholder.value}
              onChange={(e) => updateField(row.id, { value: e.target.value })}
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
