export type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffNode {
  path: string
  kind: DiffKind
  before?: unknown
  after?: unknown
  children?: DiffNode[]
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) if (!deepEqual(a[k], b[k])) return false
    return true
  }
  return false
}

export function diffJson(before: unknown, after: unknown, path = '$'): DiffNode {
  if (deepEqual(before, after)) {
    return { path, kind: 'unchanged', before, after }
  }
  if (isObject(before) && isObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
    const children = keys.map((k) =>
      diffJson(before[k], after[k], `${path}.${k}`)
    )
    return { path, kind: 'changed', before, after, children }
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length)
    const children: DiffNode[] = []
    for (let i = 0; i < len; i++) {
      children.push(diffJson(before[i], after[i], `${path}[${i}]`))
    }
    return { path, kind: 'changed', before, after, children }
  }
  if (before === undefined) return { path, kind: 'added', after }
  if (after === undefined) return { path, kind: 'removed', before }
  return { path, kind: 'changed', before, after }
}

export function summarize(node: DiffNode): { added: number; removed: number; changed: number } {
  const counts = { added: 0, removed: 0, changed: 0 }
  const walk = (n: DiffNode): void => {
    if (n.kind === 'added') counts.added++
    else if (n.kind === 'removed') counts.removed++
    else if (n.kind === 'changed' && !n.children) counts.changed++
    n.children?.forEach(walk)
  }
  walk(node)
  return counts
}
