import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ensureDefaultCategory, seedDefaults } from './seed.js';

/** Kapselt den SQLite-Treiber (node:sqlite); bei Bedarf gegen better-sqlite3 austauschbar. */
export type Database = DatabaseSync;

export const SCHEMA_VERSION = 1;

const schemaSql = (): string => readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/**
 * Öffnet (oder erstellt) die Datenbank, wendet das Schema an und legt bei der
 * Erstinitialisierung die Standardkategorien und -regeln an.
 * `file` = Dateipfad oder `:memory:` (Tests).
 */
export function openDatabase(file: string): Database {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
    if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function migrate(db: Database): void {
  const version = Number(db.prepare('PRAGMA user_version').get()?.['user_version'] ?? 0);
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Datenbank-Schema v${version} ist neuer als diese Version des Addons (v${SCHEMA_VERSION}).`,
    );
  }
  transaction(db, () => {
    if (version < 1) {
      db.exec(schemaSql());
      seedDefaults(db);
    }
    // Künftige Migrationen: if (version < 2) { ... }
    ensureDefaultCategory(db);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}

/** Führt `fn` in einer Transaktion aus; bei Fehlern wird zurückgerollt. Nicht verschachteln. */
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}
