import type Database from 'better-sqlite3'
import { dbLogger } from '../logger'

type Migration = { version: number; up: (db: Database.Database) => void }

const migrations: Migration[] = [
  {
    version: 1,
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          method TEXT NOT NULL,
          url TEXT NOT NULL,
          headers TEXT NOT NULL DEFAULT '[]',
          query_params TEXT NOT NULL DEFAULT '[]',
          body TEXT NOT NULL DEFAULT '',
          auth TEXT NOT NULL DEFAULT '{"type":"none","token":"","username":"","password":""}',
          folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_requests_folder ON requests(folder_id);
        CREATE INDEX IF NOT EXISTS idx_requests_updated ON requests(updated_at DESC);

        CREATE TABLE IF NOT EXISTS environments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '#6366f1',
          variables TEXT NOT NULL DEFAULT '{}',
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS snapshots (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
          environment_id TEXT REFERENCES environments(id) ON DELETE SET NULL,
          label TEXT,
          is_baseline INTEGER NOT NULL DEFAULT 0,
          response TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_snapshots_request ON snapshots(request_id, created_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_one_baseline
          ON snapshots(request_id) WHERE is_baseline = 1;
      `)
    }
  }
]

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)`)
  const applied = new Set(
    db.prepare<[], { version: number }>(`SELECT version FROM _migrations`).all().map((r) => r.version)
  )
  const insertVersion = db.prepare(`INSERT INTO _migrations (version) VALUES (?)`)

  for (const m of migrations) {
    if (applied.has(m.version)) continue
    dbLogger.info(`Applying migration v${m.version}`)
    const tx = db.transaction(() => {
      m.up(db)
      insertVersion.run(m.version)
    })
    tx()
  }
}
