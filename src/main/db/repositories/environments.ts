import { randomUUID } from 'crypto'
import type { Environment } from '@shared/types'
import { getDb } from '../index'

interface Row {
  id: string
  name: string
  base_url: string
  color: string
  variables: string
  created_at: number
}

function rowToEnv(r: Row): Environment {
  return {
    id: r.id,
    name: r.name,
    baseUrl: r.base_url,
    color: r.color,
    variables: JSON.parse(r.variables),
    createdAt: r.created_at
  }
}

export const environmentsRepo = {
  list(): Environment[] {
    return getDb()
      .prepare<[], Row>(`SELECT * FROM environments ORDER BY created_at ASC`)
      .all()
      .map(rowToEnv)
  },

  get(id: string): Environment | null {
    const r = getDb().prepare<[string], Row>(`SELECT * FROM environments WHERE id = ?`).get(id)
    return r ? rowToEnv(r) : null
  },

  create(input: Omit<Environment, 'id' | 'createdAt'>): Environment {
    const env: Environment = { ...input, id: randomUUID(), createdAt: Date.now() }
    getDb()
      .prepare(
        `INSERT INTO environments (id, name, base_url, color, variables, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(env.id, env.name, env.baseUrl, env.color, JSON.stringify(env.variables), env.createdAt)
    return env
  },

  update(id: string, patch: Partial<Environment>): Environment {
    const existing = this.get(id)
    if (!existing) throw new Error(`Environment ${id} not found`)
    const merged: Environment = {
      ...existing,
      ...patch,
      variables: patch.variables ?? existing.variables
    }
    getDb()
      .prepare(
        `UPDATE environments SET name = ?, base_url = ?, color = ?, variables = ? WHERE id = ?`
      )
      .run(merged.name, merged.baseUrl, merged.color, JSON.stringify(merged.variables), id)
    return merged
  },

  delete(id: string): void {
    getDb().prepare(`DELETE FROM environments WHERE id = ?`).run(id)
  }
}
