import { randomUUID } from 'crypto'
import type { ApiResponse, Snapshot } from '@shared/types'
import { getDb } from '../index'

interface Row {
  id: string
  request_id: string
  environment_id: string | null
  label: string | null
  is_baseline: number
  response: string
  created_at: number
}

function rowToSnapshot(r: Row): Snapshot {
  return {
    id: r.id,
    requestId: r.request_id,
    environmentId: r.environment_id,
    label: r.label,
    isBaseline: r.is_baseline === 1,
    response: JSON.parse(r.response) as ApiResponse,
    createdAt: r.created_at
  }
}

export const snapshotsRepo = {
  listForRequest(requestId: string): Snapshot[] {
    return getDb()
      .prepare<[string], Row>(
        `SELECT * FROM snapshots WHERE request_id = ? ORDER BY created_at DESC`
      )
      .all(requestId)
      .map(rowToSnapshot)
  },

  get(id: string): Snapshot | null {
    const r = getDb().prepare<[string], Row>(`SELECT * FROM snapshots WHERE id = ?`).get(id)
    return r ? rowToSnapshot(r) : null
  },

  create(input: Omit<Snapshot, 'id' | 'createdAt'>): Snapshot {
    const db = getDb()
    const snap: Snapshot = { ...input, id: randomUUID(), createdAt: Date.now() }
    const tx = db.transaction(() => {
      if (snap.isBaseline) {
        db.prepare(`UPDATE snapshots SET is_baseline = 0 WHERE request_id = ?`).run(snap.requestId)
      }
      db.prepare(
        `INSERT INTO snapshots (id, request_id, environment_id, label, is_baseline, response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        snap.id,
        snap.requestId,
        snap.environmentId ?? null,
        snap.label ?? null,
        snap.isBaseline ? 1 : 0,
        JSON.stringify(snap.response),
        snap.createdAt
      )
    })
    tx()
    return snap
  },

  setBaseline(id: string): Snapshot {
    const db = getDb()
    const snap = this.get(id)
    if (!snap) throw new Error(`Snapshot ${id} not found`)
    const tx = db.transaction(() => {
      db.prepare(`UPDATE snapshots SET is_baseline = 0 WHERE request_id = ?`).run(snap.requestId)
      db.prepare(`UPDATE snapshots SET is_baseline = 1 WHERE id = ?`).run(id)
    })
    tx()
    return { ...snap, isBaseline: true }
  },

  delete(id: string): void {
    getDb().prepare(`DELETE FROM snapshots WHERE id = ?`).run(id)
  }
}
