import type { Database } from '../src/db/database.js';

export interface TxSeed {
  date: string;
  counterparty?: string;
  purpose?: string;
  amountCents: number;
  categoryId?: number | null;
  source?: 'rule' | 'manual' | 'default';
}

/** ID einer Kategorie anhand ihres Namens (Seed-Daten). */
export function categoryId(db: Database, name: string): number {
  const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (!row) throw new Error(`Kategorie ${name} fehlt`);
  return Number(row['id']);
}

/**
 * Legt direkt einen Auszug mit Buchungen an – ohne PDF-Parsing, damit API-Tests schnell bleiben.
 * Gibt die IDs der Buchungen in Eingabereihenfolge zurück.
 */
export function insertTransactions(db: Database, txs: TxSeed[], iban = 'DE00TEST'): number[] {
  const [year, month] = txs[0]!.date.split('-').map(Number);
  const { lastInsertRowid: statementId } = db
    .prepare(
      `INSERT INTO statements (bank, iban, year, month, opening_cents, closing_cents, file_hash, file_name)
       VALUES ('TEST', ?, ?, ?, 0, 0, ?, 'test.pdf')`,
    )
    .run(iban, year!, month!, `${iban}-${year}-${month}-${Math.random()}`);

  const insert = db.prepare(
    `INSERT INTO transactions (statement_id, booking_date, value_date, counterparty, purpose, amount_cents, category_id, category_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  return txs.map((tx) =>
    Number(
      insert.run(
        statementId,
        tx.date,
        tx.date,
        tx.counterparty ?? '',
        tx.purpose ?? '',
        tx.amountCents,
        tx.categoryId ?? null,
        tx.source ?? 'default',
      ).lastInsertRowid,
    ),
  );
}
