import { useMemo, useState } from 'react'
import { Camera, Check, GitCompare, Save, Star, Trash2 } from 'lucide-react'
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

type Tab = 'response' | 'diff' | 'snapshots'

export function ResponseViewer({ requestId }: Props) {
  const response = useResponseStore((s) => s.responses[requestId])
  const { data: snapshots = [] } = useSnapshots(requestId)
  const createSnapshot = useCreateSnapshot(requestId)
  const deleteSnapshot = useDeleteSnapshot(requestId)
  const setBaseline = useSetBaseline(requestId)
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)

  const [tab, setTab] = useState<Tab>('response')
  const [label, setLabel] = useState('')
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  const baseline = snapshots.find((s) => s.isBaseline) ?? null
  const selectedSnapshot = selectedSnapshotId
    ? snapshots.find((s) => s.id === selectedSnapshotId) ?? null
    : null

  // Diff sources, in priority order:
  //  - explicitly selected snapshot vs live response (or vs baseline / newest when no response)
  //  - live response vs baseline (or most recent snapshot)
  //  - newest snapshot vs baseline / previous snapshot (when no live response)
  const compareSnapshot = useMemo(() => baseline ?? snapshots[0] ?? null, [baseline, snapshots])
  const labelFor = (s: { label?: string | null; isBaseline?: boolean }, fallback: string): string =>
    s.isBaseline ? 'baseline' : s.label?.trim() || fallback

  const diffPair = useMemo(() => {
    if (selectedSnapshot) {
      if (response) {
        return {
          before: selectedSnapshot.response.data,
          after: response.data,
          leftLabel: labelFor(selectedSnapshot, 'selected snapshot'),
          rightLabel: 'current response'
        }
      }
      const other =
        baseline && baseline.id !== selectedSnapshot.id
          ? baseline
          : snapshots.find((s) => s.id !== selectedSnapshot.id) ?? null
      if (other) {
        return {
          before: other.response.data,
          after: selectedSnapshot.response.data,
          leftLabel: labelFor(other, 'other snapshot'),
          rightLabel: labelFor(selectedSnapshot, 'selected snapshot')
        }
      }
      return null
    }
    if (response && compareSnapshot) {
      return {
        before: compareSnapshot.response.data,
        after: response.data,
        leftLabel: labelFor(compareSnapshot, 'latest snapshot'),
        rightLabel: 'current response'
      }
    }
    if (snapshots.length >= 2) {
      const newest = snapshots[0]
      const reference = baseline && baseline.id !== newest.id ? baseline : snapshots[1]
      return {
        before: reference.response.data,
        after: newest.response.data,
        leftLabel: labelFor(reference, 'older snapshot'),
        rightLabel: labelFor(newest, 'latest snapshot')
      }
    }
    return null
  }, [selectedSnapshot, response, compareSnapshot, snapshots, baseline])

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
      <div className="flex items-center justify-between border-b border-(--color-border) px-4 h-9 shrink-0">
        <div className="flex items-center gap-1">
          <TabButton active={tab === 'response'} onClick={() => setTab('response')}>
            Response
          </TabButton>
          <TabButton
            active={tab === 'diff'}
            onClick={() => setTab('diff')}
            title={
              diffPair
                ? `Diff: ${diffPair.leftLabel} → ${diffPair.rightLabel}`
                : 'Diff — needs a response and a snapshot, or two snapshots'
            }
          >
            <GitCompare className="h-3 w-3" />
            Diff
          </TabButton>
          <TabButton active={tab === 'snapshots'} onClick={() => setTab('snapshots')}>
            <Camera className="h-3 w-3" />
            Snapshots
            {snapshots.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[15px] px-1 rounded-full bg-(--color-bg-elev) border border-(--color-border) text-[10px] font-mono text-(--color-fg-muted)">
                {snapshots.length}
              </span>
            )}
          </TabButton>
        </div>
        {response && (
          <div className="flex items-center gap-3 text-[12px] text-(--color-fg-muted) font-mono">
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

      {tab !== 'snapshots' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-[12px] selectable">
          {tab === 'response' && response && <pre>{prettyJson(response.data)}</pre>}
          {tab === 'response' && !response && (
            <div className="text-(--color-fg-muted) text-[13px] font-sans">
              No live response. Open Snapshots to view saved results.
            </div>
          )}
          {tab === 'diff' && diffPair && (
            <div className="space-y-2">
              <div className="text-[11px] text-(--color-fg-muted) font-sans">
                <span className="text-(--color-danger)">– {diffPair.leftLabel}</span>
                <span className="mx-2 text-(--color-fg-subtle)">vs</span>
                <span className="text-(--color-success)">+ {diffPair.rightLabel}</span>
              </div>
              <JsonDiffView before={diffPair.before} after={diffPair.after} />
            </div>
          )}
          {tab === 'diff' && !diffPair && (
            <div className="text-(--color-fg-muted) text-[13px] font-sans space-y-2">
              <p>Nothing to diff yet.</p>
              {!response && snapshots.length === 0 && (
                <p>Send a request, then save the result as a snapshot. Send again to diff the two.</p>
              )}
              {response && snapshots.length === 0 && (
                <p>Save the current response as a snapshot, then send the request again.</p>
              )}
              {!response && snapshots.length === 1 && (
                <p>Send a request to diff against the saved snapshot.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'snapshots' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-(--color-border) flex items-center gap-2 shrink-0">
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={!response}
              className="max-w-xs"
            />
            <Button
              size="sm"
              onClick={() => handleSaveSnapshot(false)}
              disabled={!response || createSnapshot.isPending}
            >
              <Save className="h-3 w-3" /> Save snapshot
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveSnapshot(true)}
              disabled={!response || createSnapshot.isPending}
              title="Save as baseline"
            >
              <Star className="h-3 w-3" /> Baseline
            </Button>
            {!response && (
              <span className="text-[12px] text-(--color-fg-subtle) ml-1">
                Send a request to save a snapshot.
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {snapshots.length === 0 && (
              <div className="text-[13px] text-(--color-fg-muted) text-center py-8">
                No snapshots yet.
              </div>
            )}
            <div className="grid gap-1.5">
              {snapshots.map((s) => {
                const isSelected = s.id === selectedSnapshotId
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedSnapshotId(isSelected ? null : s.id)
                      setTab('diff')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedSnapshotId(isSelected ? null : s.id)
                        setTab('diff')
                      }
                    }}
                    className={cn(
                      'group rounded-md border px-3 py-2 text-[12.5px] cursor-pointer',
                      isSelected
                        ? 'bg-(--color-bg-elev) border-(--color-accent)/40'
                        : 'border-(--color-border) hover:bg-(--color-bg-elev)'
                    )}
                    title={
                      isSelected ? 'Click to deselect' : 'Click to diff against this snapshot'
                    }
                  >
                    <div className="flex items-center gap-2">
                      {s.isBaseline && (
                        <Star className="h-3 w-3 text-(--color-warn) fill-current shrink-0" />
                      )}
                      <span className="font-medium truncate">{s.label || 'Snapshot'}</span>
                      <span className="font-mono text-[11px] text-(--color-fg-muted)">
                        {s.response.status} · {formatBytes(s.response.size)}
                      </span>
                      <span className="ml-auto text-[11px] text-(--color-fg-subtle)">
                        {formatRelative(s.createdAt)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        {!s.isBaseline && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setBaseline.mutate(s.id)
                            }}
                            className="text-[11px] text-(--color-fg-muted) hover:text-(--color-fg) inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-(--color-bg)"
                            title="Set as baseline"
                          >
                            <Check className="h-2.5 w-2.5" /> Baseline
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isSelected) setSelectedSnapshotId(null)
                            deleteSnapshot.mutate(s.id)
                          }}
                          className="text-(--color-fg-muted) hover:text-(--color-danger) p-0.5 rounded hover:bg-(--color-bg)"
                          title="Delete snapshot"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
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
