import { useMemo, useState } from 'react'
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  GitCompare,
  Pencil,
  Save,
  Star,
  Trash2,
  X
} from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useResponseStore } from '../stores/response'
import {
  useCreateSnapshot,
  useDeleteSnapshot,
  useRenameSnapshot,
  useSetBaseline,
  useSnapshots
} from '../queries/snapshots'
import { useUiStore } from '../stores/ui'
import { JsonDiffView } from './JsonDiffView'
import { JsonView } from './JsonView'
import { cn, formatBytes, formatMs, formatRelative } from '../lib/utils'
import type { ApiResponse, Snapshot } from '../../../shared/types'

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
  const renameSnapshot = useRenameSnapshot(requestId)
  const activeEnvId = useUiStore((s) => s.activeEnvironmentId)

  const [tab, setTab] = useState<Tab>('response')
  const [label, setLabel] = useState('')
  // null = auto-resolve; 'response' = live response; otherwise a snapshot id.
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const baseline = snapshots.find((s) => s.isBaseline) ?? null
  const labelFor = (s: { label?: string | null; isBaseline?: boolean }, fallback: string): string =>
    s.isBaseline ? 'baseline' : s.label?.trim() || fallback

  const { diffPair, leftValue, rightValue } = useMemo(() => {
    type Source = { data: unknown; label: string; value: string }
    const responseSource = (): Source | null =>
      response ? { data: response.data, label: 'current response', value: 'response' } : null
    const snapshotSource = (id: string): Source | null => {
      const s = snapshots.find((x) => x.id === id)
      return s ? { data: s.response.data, label: labelFor(s, 'snapshot'), value: s.id } : null
    }
    const autoLeft = (): Source | null => {
      const def = baseline ?? snapshots[0]
      if (def) return { data: def.response.data, label: labelFor(def, 'latest snapshot'), value: def.id }
      return responseSource()
    }
    const autoRight = (leftValueLocal: string | null): Source | null => {
      if (response) return responseSource()
      const other = snapshots.find((s) => s.id !== leftValueLocal) ?? snapshots[0] ?? null
      return other ? { data: other.response.data, label: labelFor(other, 'latest snapshot'), value: other.id } : null
    }

    const left =
      (leftId === 'response' ? responseSource() : leftId ? snapshotSource(leftId) : null) ?? autoLeft()
    const right =
      (rightId === 'response' ? responseSource() : rightId ? snapshotSource(rightId) : null) ??
      autoRight(left?.value ?? null)

    return {
      diffPair:
        left && right
          ? { before: left.data, after: right.data, leftLabel: left.label, rightLabel: right.label }
          : null,
      leftValue: left?.value ?? '',
      rightValue: right?.value ?? ''
    }
  }, [leftId, rightId, response, snapshots, baseline])

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
        <div className="flex-1 flex flex-col overflow-hidden p-3 font-mono text-[12px] selectable min-h-0">
          {tab === 'response' && response && <JsonView data={response.data} />}
          {tab === 'response' && !response && (
            <div className="text-(--color-fg-muted) text-[13px] font-sans">
              No live response. Open Snapshots to view saved results.
            </div>
          )}
          {tab === 'diff' && diffPair && (
            <div className="flex-1 flex flex-col min-h-0">
              <JsonDiffView
                before={diffPair.before}
                after={diffPair.after}
                headerSlot={
                  <div className="flex items-center gap-2 text-[11px] text-(--color-fg-muted) font-sans min-w-0">
                    <DiffSourceSelect
                      effectiveValue={leftValue}
                      rawValue={leftId}
                      onChange={setLeftId}
                      response={response}
                      snapshots={snapshots}
                      labelFor={labelFor}
                      side="left"
                    />
                    <span className="text-(--color-fg-subtle) shrink-0">vs</span>
                    <DiffSourceSelect
                      effectiveValue={rightValue}
                      rawValue={rightId}
                      onChange={setRightId}
                      response={response}
                      snapshots={snapshots}
                      labelFor={labelFor}
                      side="right"
                    />
                  </div>
                }
              />
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
                const isExpanded = s.id === expandedSnapshotId
                const isRenaming = s.id === renamingId
                const toggleExpand = (): void => {
                  setExpandedSnapshotId(isExpanded ? null : s.id)
                }
                const startRename = (): void => {
                  setRenamingId(s.id)
                  setRenameDraft(s.label ?? '')
                }
                const cancelRename = (): void => {
                  setRenamingId(null)
                  setRenameDraft('')
                }
                const commitRename = (): void => {
                  const next = renameDraft.trim() || null
                  if (next !== (s.label ?? null)) {
                    renameSnapshot.mutate({ id: s.id, label: next })
                  }
                  cancelRename()
                }
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'group rounded-md border text-[12.5px]',
                      isExpanded
                        ? 'bg-(--color-bg-elev) border-(--color-accent)/40'
                        : 'border-(--color-border) hover:bg-(--color-bg-elev)'
                    )}
                  >
                    <div
                      role={isRenaming ? undefined : 'button'}
                      tabIndex={isRenaming ? undefined : 0}
                      onClick={isRenaming ? undefined : toggleExpand}
                      onKeyDown={(e) => {
                        if (isRenaming) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleExpand()
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        !isRenaming && 'cursor-pointer'
                      )}
                      title={
                        isRenaming
                          ? undefined
                          : isExpanded
                            ? 'Click to collapse'
                            : 'Click to view saved response'
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-(--color-fg-muted) shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-(--color-fg-muted) shrink-0" />
                      )}
                      {s.isBaseline && (
                        <Star className="h-3 w-3 text-(--color-warn) fill-current shrink-0" />
                      )}
                      {isRenaming ? (
                        <Input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitRename()
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelRename()
                            }
                          }}
                          onBlur={commitRename}
                          placeholder="Label"
                          className="h-6 max-w-[220px] text-[12.5px]"
                        />
                      ) : (
                        <span className="font-medium truncate">{s.label || 'Snapshot'}</span>
                      )}
                      <span className="font-mono text-[11px] text-(--color-fg-muted)">
                        {s.response.status} · {formatBytes(s.response.size)}
                      </span>
                      <span className="ml-auto text-[11px] text-(--color-fg-subtle)">
                        {formatRelative(s.createdAt)}
                      </span>
                      {!isRenaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startRename()
                            }}
                            className="text-(--color-fg-muted) hover:text-(--color-fg) p-0.5 rounded hover:bg-(--color-bg)"
                            title="Rename snapshot"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
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
                              if (s.id === leftId) setLeftId(null)
                              if (s.id === rightId) setRightId(null)
                              if (s.id === expandedSnapshotId) setExpandedSnapshotId(null)
                              deleteSnapshot.mutate(s.id)
                            }}
                            className="text-(--color-fg-muted) hover:text-(--color-danger) p-0.5 rounded hover:bg-(--color-bg)"
                            title="Delete snapshot"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {isRenaming && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              commitRename()
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            className="text-(--color-fg-muted) hover:text-(--color-success) p-0.5 rounded hover:bg-(--color-bg)"
                            title="Save (Enter)"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelRename()
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            className="text-(--color-fg-muted) hover:text-(--color-danger) p-0.5 rounded hover:bg-(--color-bg)"
                            title="Cancel (Esc)"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="border-t border-(--color-border) p-3 font-mono text-[12px] selectable max-h-[420px] overflow-auto">
                        <JsonView data={s.response.data} />
                      </div>
                    )}
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

function DiffSourceSelect({
  effectiveValue,
  rawValue,
  onChange,
  response,
  snapshots,
  labelFor,
  side
}: {
  effectiveValue: string
  rawValue: string | null
  onChange: (id: string | null) => void
  response: ApiResponse | undefined
  snapshots: Snapshot[]
  labelFor: (s: { label?: string | null; isBaseline?: boolean }, fallback: string) => string
  side: 'left' | 'right'
}): React.ReactElement {
  const value = rawValue ?? ''
  const autoSummary = (() => {
    if (!effectiveValue) return 'nothing'
    if (effectiveValue === 'response') return 'current response'
    const s = snapshots.find((x) => x.id === effectiveValue)
    return s ? labelFor(s, 'snapshot') : 'snapshot'
  })()
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-(--color-bg-elev) border border-(--color-border) rounded px-1.5 py-0.5 text-[11px] text-(--color-fg) outline-none hover:border-(--color-fg-muted) focus:border-(--color-accent) cursor-pointer max-w-[260px]"
      title={`Choose the ${side} side of the diff`}
    >
      <option value="">Auto · {autoSummary}</option>
      {response && <option value="response">Current response</option>}
      {snapshots.map((s) => (
        <option key={s.id} value={s.id}>
          {labelFor(s, 'snapshot')} · {formatRelative(s.createdAt)}
        </option>
      ))}
    </select>
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

