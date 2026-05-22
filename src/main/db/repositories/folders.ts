import { randomUUID } from 'crypto'
import type { Folder } from '@shared/types'
import { getDb } from '../index'

interface Row {
  id: string
  name: string
  created_at: number
}

export const foldersRepo = {
  list(): Folder[] {
    const rows = getDb()
      .prepare<[], Row>(`SELECT * FROM folders ORDER BY created_at DESC`)
      .all()
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }))
  },

  create(name: string): Folder {
    const folder: Folder = { id: randomUUID(), name, createdAt: Date.now() }
    getDb()
      .prepare(`INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)`)
      .run(folder.id, folder.name, folder.createdAt)
    return folder
  },

  delete(id: string): void {
    getDb().prepare(`DELETE FROM folders WHERE id = ?`).run(id)
  }
}
