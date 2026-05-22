import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { dbLogger } from '../logger'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDb() first')
  return db
}

export function initDb(): Database.Database {
  if (db) return db
  const file = join(app.getPath('userData'), 'delta.sqlite')
  dbLogger.info('Opening database at', file)
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
