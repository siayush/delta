import { useMemo, useState } from 'react'
import { Check, GitCompare, Save, Star, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useResponseStore } from '../stores/response'
import {
  useCreateSnapshot,
  useDeleteSnapshot,
  useSetBaseline,
  useSnapshots
} from '../queries/snapshots'
import { useUiStore } from '../stores/ui'
import { JsonDiffView } from './JsonDiffView'
import { cn, formatBytes, formatMs, formatRelative } from '../lib/utils'

interface Props {
  requestId: string
}

type Tab = 'response' | 'diff'

export function ResponseViewer({ requestId }: Props) {
  const response = useResponseStore((s) => s.responses[requestId])
  const { data: snapshots = [] } = useSnapshots(requestId)
  const createSnapshot = useCreateSnapshot(requestId)
  const deleteSnapshot = useDeleteSnapshot(requestId)
  const setBaseline = useSetBaseline(requestId)
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)

  const [tab, setTab] = useState<Tab>('response')
  const [label, setLabel] = useState('')
  const baseline = snapshots.find((s) => s.isBaseline) ?? null

  // Prefer the explicit baseline; fall back to the most recent snapshot
  // so the Diff tab is usable as soon as anything has been saved.
  const compareSnapshot = useMemo(() => baseline ?? snapshots[0] ?? null, [baseline, snapshots])
  const compareTarget = compareSnapshot?.response ?? null

  if (!response && snapshots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-(--color-fg-muted) bg-(--color-bg) text-[13px]">
        Send a request to see the response.
      </div>
    )
  }

  const handleSaveSnapshot = async (asBaseline: boolean): Promise<void> => {
    if (!response) return
    await createSnapshot.mutateAsync({
      requestId,
      environmentId: activeEnvId ?? null,
      label: label.trim() || null,
      isBaseline: asBaseline,
      response
    })
    setLabel('')
  }

  return (
    <div className="flex flex-col flex-1 bg-(--color-bg) overflow-hidden">
      <div className="flex items-center justify-between border-b border-(--color-border) px-4 h-9">
        <div className="flex items-center gap-1">
          <TabButton active={tab === 'response'} onClick={() => setTab('response')}>
            Response
          </TabButton>
          <TabButton
            active={tab === 'diff'}
            onClick={() => setTab('diff')}
            disabled={!compareTarget || !response}
            title={
              !response
                ? 'Send a request first'
                : !compareTarget
                  ? 'Save a snapshot first'
                  : baseline
                    ? 'Diff vs baseline'
                    : 'Diff vs latest snapshot'
            }
          >
            <GitCompare className="h-3 w-3" />
            {baseline ? 'Diff vs baseline' : 'Diff vs latest'}
          </TabButton>
        </div>
        {response && (
          <div className="flex items-center gap-3 text-[11.5px] text-(--color-fg-muted) font-mono">
            <span
              className={cn(
                response.status >= 400 && 'text-(--color-danger)',
                response.status >= 200 &&
                  response.status < 300 &&
                  'text-(--color-success)'
              )}
            >
              {response.status} {response.statusText}
            </span>
            <span>{formatMs(response.responseTime)}</span>
            <span>{formatBytes(response.size)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_280px] flex-1 overflow-hidden">
        <div className="overflow-auto p-3 font-mono text-[12px] selectable">
          {tab === 'response' && response && <pre>{prettyJson(response.data)}</pre>}
          {tab === 'diff' && response && compareTarget && (
            <JsonDiffView before={compareTarget.data} after={response.data} />
          )}
          {tab === 'response' && !response && (
            <div className="text-(--color-fg-muted) text-[13px]">No live response. Snapshots →</div>
          )}
        </div>

        <aside className="border-l border-(--color-border) bg-(--color-bg-elev) flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-(--color-border) space-y-2">
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={!response}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSaveSnapshot(false)}
                disabled={!response || createSnapshot.isPending}
                className="flex-1"
              >
                <Save className="h-3 w-3" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveSnapshot(true)}
                disabled={!response || createSnapshot.isPending}
                title="Save as baseline"
              >
                <Star className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {snapshots.length === 0 && (
              <div className="text-[12px] text-(--color-fg-muted) text-center py-4">
                No snapshots yet.
              </div>
            )}
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="group rounded p-2 hover:bg-(--color-bg) text-[12px] mb-0.5"
              >
                <div className="flex items-center gap-1.5">
                  {s.isBaseline && <Star className="h-3 w-3 text-(--color-warn) fill-current" />}
                  <span className="font-medium truncate">{s.label || 'Snapshot'}</span>
                  <span className="ml-auto text-[10.5px] text-(--color-fg-subtle)">
                    {formatRelative(s.createdAt)}
                  </span>
                </div>
                <div className="font-mono text-[10.5px] text-(--color-fg-muted) mt-0.5">
                  {s.response.status} · {formatBytes(s.response.size)}
                </div>
                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100">
                  {!s.isBaseline && (
                    <button
                      onClick={() => setBaseline.mutate(s.id)}
                      className="text-[10.5px] text-(--color-fg-muted) hover:text-(--color-fg) inline-flex items-center gap-0.5"
                      title="Set as baseline"
                    >
                      <Check className="h-2.5 w-2.5" /> Baseline
                    </button>
                  )}
                  <button
                    onClick={() => deleteSnapshot.mutate(s.id)}
                    className="text-[10.5px] text-(--color-fg-muted) hover:text-(--color-danger) inline-flex items-center gap-0.5 ml-auto"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function TabButton({
  children,
  active,
  onClick,
  disabled,
  title
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-9 px-3 text-[12px] inline-flex items-center gap-1.5 border-b-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'border-(--color-accent) text-(--color-fg)'
          : 'border-transparent text-(--color-fg-muted) hover:text-(--color-fg)'
      )}
    >
      {children}
    </button>
  )
}

function prettyJson(data: unknown): string {
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
