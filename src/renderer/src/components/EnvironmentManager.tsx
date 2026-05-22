import { useState } from 'react'
import { ChevronDown, Layers, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useUpdateEnvironment
} from '../queries/environments'
import { useUiStore } from '../stores/ui'
import { cn } from '../lib/utils'

export function EnvironmentManager() {
  const { data: envs = [] } = useEnvironments()
  const create = useCreateEnvironment()
  const update = useUpdateEnvironment()
  const remove = useDeleteEnvironment()
  const activeId = useUiStore((s) => s.activeEnvironmentId)
  const setActiveId = useUiStore((s) => s.setActiveEnvironmentId)

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const active = envs.find((e) => e.id === activeId) ?? null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[12px] border border-(--color-border) bg-(--color-bg) hover:bg-(--color-bg-elev)"
      >
        <Layers className="h-3 w-3" />
        {active ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: active.color }} />
            {active.name}
          </span>
        ) : (
          <span className="text-(--color-fg-muted)">No environment</span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-80 rounded-lg border border-(--color-border) bg-(--color-bg-elev) shadow-xl z-20 p-2">
            <button
              onClick={() => setActiveId(null)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-(--color-bg)',
                !activeId && 'bg-(--color-bg)'
              )}
            >
              No environment
            </button>
            {envs.map((e) => (
              <div key={e.id} className="group flex items-center gap-1">
                <button
                  onClick={() => {
                    setActiveId(e.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex-1 text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-(--color-bg) inline-flex items-center gap-2',
                    activeId === e.id && 'bg-(--color-bg)'
                  )}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="truncate">{e.name}</span>
                  <span className="ml-auto text-[10.5px] text-(--color-fg-subtle) truncate">
                    {e.baseUrl}
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6"
                  onClick={() => setEdit(e.id)}
                  title="Edit"
                >
                  ⋯
                </Button>
              </div>
            ))}
            <div className="border-t border-(--color-border) mt-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const env = await create.mutateAsync({
                    name: 'New environment',
                    baseUrl: '',
                    color: '#6366f1',
                    variables: {}
                  })
                  setEdit(env.id)
                }}
                className="w-full"
              >
                <Plus className="h-3 w-3" /> New environment
              </Button>
            </div>
          </div>
        </>
      )}

      {edit && (
        <EnvironmentEditModal
          envId={edit}
          onClose={() => setEdit(null)}
          onSave={(id, patch) => update.mutate({ id, patch })}
          onDelete={(id) => {
            remove.mutate(id)
            setEdit(null)
          }}
        />
      )}
    </div>
  )
}

interface EditProps {
  envId: string
  onClose: () => void
  onSave: (id: string, patch: Partial<{ name: string; baseUrl: string; color: string; variables: Record<string, string> }>) => void
  onDelete: (id: string) => void
}

function EnvironmentEditModal({ envId, onClose, onSave, onDelete }: EditProps) {
  const { data: envs = [] } = useEnvironments()
  const env = envs.find((e) => e.id === envId)
  if (!env) return null

  const handleVarChange = (idx: number, key: string, value: string): void => {
    const entries = Object.entries(env.variables)
    const next: Record<string, string> = {}
    entries.forEach(([k, v], i) => {
      if (i === idx) next[key] = value
      else next[k] = v
    })
    onSave(envId, { variables: next })
  }

  const addVar = (): void => onSave(envId, { variables: { ...env.variables, '': '' } })
  const removeVar = (idx: number): void => {
    const next: Record<string, string> = {}
    Object.entries(env.variables).forEach(([k, v], i) => {
      if (i !== idx) next[k] = v
    })
    onSave(envId, { variables: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[480px] rounded-xl border border-(--color-border) bg-(--color-bg-elev) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-(--color-border) flex items-center justify-between">
          <h3 className="font-semibold">Edit environment</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
        <div className="p-4 space-y-3">
          <Input
            value={env.name}
            onChange={(e) => onSave(envId, { name: e.target.value })}
            placeholder="Name"
          />
          <Input
            value={env.baseUrl}
            onChange={(e) => onSave(envId, { baseUrl: e.target.value })}
            placeholder="Base URL (e.g. https://api.example.com)"
            className="font-mono"
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-(--color-fg-muted)">Color</span>
            <input
              type="color"
              value={env.color}
              onChange={(e) => onSave(envId, { color: e.target.value })}
              className="h-7 w-12 rounded border border-(--color-border) bg-transparent"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold mb-2">
              Variables
            </div>
            <div className="space-y-1.5">
              {Object.entries(env.variables).map(([k, v], idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={k}
                    onChange={(e) => handleVarChange(idx, e.target.value, v)}
                    placeholder="key"
                    className="font-mono"
                  />
                  <Input
                    value={v}
                    onChange={(e) => handleVarChange(idx, k, e.target.value)}
                    placeholder="value"
                    className="font-mono"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeVar(idx)}>
                    ×
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addVar}>
                + Add variable
              </Button>
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-(--color-border) flex justify-between">
          <Button variant="danger" size="sm" onClick={() => onDelete(envId)}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
