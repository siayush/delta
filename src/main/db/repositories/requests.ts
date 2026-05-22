import { randomUUID } from 'crypto'
import type { ApiRequest, HttpMethod } from '@shared/types'
import { getDb } from '../index'

interface Row {
  id: string
  name: string
  method: string
  url: string
  headers: string
  query_params: string
  body: string
  folder_id: string | null
  created_at: number
  updated_at: number
}

function rowToRequest(r: Row): ApiRequest {
  return {
    id: r.id,
    name: r.name,
    method: r.method as HttpMethod,
    url: r.url,
    headers: JSON.parse(r.headers),
    queryParams: JSON.parse(r.query_params),
    body: r.body,
    folderId: r.folder_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export const requestsRepo = {
  list(): ApiRequest[] {
    const rows = getDb()
      .prepare<[], Row>(`SELECT * FROM requests ORDER BY updated_at DESC`)
      .all()
    return rows.map(rowToRequest)
  },

  get(id: string): ApiRequest | null {
    const r = getDb().prepare<[string], Row>(`SELECT * FROM requests WHERE id = ?`).get(id)
    return r ? rowToRequest(r) : null
  },

  create(input: Partial<ApiRequest> & { name: string; method: HttpMethod }): ApiRequest {
    const now = Date.now()
    const req: ApiRequest = {
      id: randomUUID(),
      name: input.name,
      method: input.method,
      url: input.url ?? '',
      headers: input.headers ?? {},
      queryParams: input.queryParams ?? {},
      body: input.body ?? '',
      folderId: input.folderId ?? null,
      createdAt: now,
      updatedAt: now
    }
    getDb()
      .prepare(
        `INSERT INTO requests (id, name, method, url, headers, query_params, body, folder_id, created_at, updated_at)
         VALUES (@id, @name, @method, @url, @headers, @query_params, @body, @folder_id, @created_at, @updated_at)`
      )
      .run({
        id: req.id,
        name: req.name,
        method: req.method,
        url: req.url,
        headers: JSON.stringify(req.headers),
        query_params: JSON.stringify(req.queryParams),
        body: req.body,
        folder_id: req.folderId,
        created_at: req.createdAt,
        updated_at: req.updatedAt
      })
    return req
  },

  update(id: string, patch: Partial<ApiRequest>): ApiRequest {
    const existing = this.get(id)
    if (!existing) throw new Error(`Request ${id} not found`)
    const merged: ApiRequest = {
      ...existing,
      ...patch,
      headers: patch.headers ?? existing.headers,
      queryParams: patch.queryParams ?? existing.queryParams,
      updatedAt: Date.now()
    }
    getDb()
      .prepare(
        `UPDATE requests SET
           name = @name, method = @method, url = @url,
           headers = @headers, query_params = @query_params, body = @body,
           folder_id = @folder_id, updated_at = @updated_at
         WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        method: merged.method,
        url: merged.url,
        headers: JSON.stringify(merged.headers),
        query_params: JSON.stringify(merged.queryParams),
        body: merged.body,
        folder_id: merged.folderId ?? null,
        updated_at: merged.updatedAt
      })
    return merged
  },

  delete(id: string): void {
    getDb().prepare(`DELETE FROM requests WHERE id = ?`).run(id)
  }
}
