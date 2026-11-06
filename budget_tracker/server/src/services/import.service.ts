import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ImportResult, Statement } from '../../../shared/api-types.js';
import type { CategoryAssignment } from '../categorization/categorizer.js';
import { transaction, type Database } from '../db/database.js';
import { HttpError, badRequest, notFound } from '../http-error.js';
import {
  StatementParseError,
  type BankParser,
  type ParsedTransaction,
} from '../parsing/bank-parser.js';
import { IngParser } from '../parsing/ing-parser.js';
import { extractLines } from '../parsing/pdf-text.js';

/** Ordnet einer Buchung beim Import eine Kategorie zu. */
export type Categorize = (tx: ParsedTransaction) => CategoryAssignment;

export interface ImportServiceOptions {
  /** Ablage der Original-PDFs; `null` = nicht speichern (Tests). */
  uploadsDir?: string | null;
  parsers?: BankParser[];
  /** Standard: alle Buchungen in die Fallback-Kategorie. */
  categorize?: Categorize;
}

export interface ImportOptions {
  /** Vorhandenen Auszug (gleiche Datei oder gleiche IBAN + Monat) ersetzen */
  replace?: boolean;
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatCents = (cents: number): string => euro.format(cents / 100);

const STATEMENT_SELECT = `
  SELECT s.*, (SELECT COUNT(*) FROM transactions t WHERE t.statement_id = s.id) AS transaction_count
    FROM statements s`;

function toStatement(row: Record<string, unknown>): Statement {
  return {
    id: Number(row['id']),
    bank: String(row['bank']),
    iban: String(row['iban']),
    year: Number(row['year']),
    month: Number(row['month']),
    openingCents: Number(row['opening_cents']),
    closingCents: Number(row['closing_cents']),
    fileName: String(row['file_name']),
    importedAt: String(row['imported_at']),
    transactionCount: Number(row['transaction_count'] ?? 0),
  };
}

/** Browser senden UTF-8-Dateinamen, die busboy als latin1 liest – hier zurückwandeln. */
export function normalizeFileName(name: string | undefined): string {
  let result = basename(name?.trim() || 'kontoauszug.pdf');
  const decoded = Buffer.from(result, 'latin1').toString('utf8');
  if (!decoded.includes('\uFFFD') && [...result].some((c) => c.charCodeAt(0) > 0x7f))
    result = decoded;
  return result.slice(0, 200);
}

export class ImportService {
  private readonly uploadsDir: string | null;
  private readonly parsers: BankParser[];
  private readonly categorize: Categorize;

  constructor(
    private readonly db: Database,
    options: ImportServiceOptions = {},
  ) {
    this.uploadsDir = options.uploadsDir ?? null;
    this.parsers = options.parsers ?? [new IngParser()];
    this.categorize = options.categorize ?? this.defaultCategorize();
  }

  async importPdf(
    file: Uint8Array,
    originalName: string | undefined,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    if (!isPdf(file)) throw badRequest('Die Datei ist kein PDF-Dokument.', 'INVALID_FILE');

    const fileHash = createHash('sha256').update(file).digest('hex');
    const fileName = normalizeFileName(originalName);

    let lines;
    try {
      lines = await extractLines(file);
    } catch (error) {
      const name = (error as Error | undefined)?.name;
      if (name === 'PasswordException') {
        throw badRequest(
          'Das PDF ist passwortgeschützt und kann nicht gelesen werden.',
          'INVALID_FILE',
        );
      }
      throw badRequest('Das PDF konnte nicht gelesen werden.', 'INVALID_FILE');
    }

    const parser = this.parsers.find((p) => p.canParse(lines));
    if (!parser) {
      throw badRequest(
        'Kein unterstützter Kontoauszug erkannt (derzeit werden nur ING-Girokonto-Auszüge unterstützt).',
        'UNSUPPORTED_STATEMENT',
      );
    }

    let parsed;
    try {
      parsed = parser.parse(lines);
    } catch (error) {
      if (error instanceof StatementParseError) {
        throw badRequest(
          `Kontoauszug konnte nicht ausgewertet werden: ${error.message}`,
          'PARSE_ERROR',
        );
      }
      throw error;
    }

    const duplicateRows = this.db
      .prepare(
        `${STATEMENT_SELECT} WHERE s.file_hash = ? OR (s.iban = ? AND s.year = ? AND s.month = ?)`,
      )
      .all(fileHash, parsed.iban, parsed.year, parsed.month);
    const duplicates = duplicateRows.map(toStatement);
    if (duplicates.length && !options.replace) {
      const existing = duplicates[0]!;
      throw new HttpError(
        409,
        `Der Kontoauszug ${String(existing.month).padStart(2, '0')}/${existing.year} wurde bereits importiert.`,
        'DUPLICATE_STATEMENT',
        { existing },
      );
    }

    const warnings: string[] = [];
    const sumCents = parsed.transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
    const expectedCents = parsed.closingCents - parsed.openingCents;
    const balanceOk = sumCents === expectedCents;
    if (!balanceOk) {
      warnings.push(
        `Die Summe der Buchungen (${formatCents(sumCents)}) entspricht nicht der Differenz von ` +
          `neuem und altem Saldo (${formatCents(expectedCents)}). Bitte den Auszug prüfen.`,
      );
    }
    if (parsed.transactions.length === 0)
      warnings.push('Im Kontoauszug wurden keine Buchungen gefunden.');

    const assignments = parsed.transactions.map((tx) => this.categorize(tx));
    const uncategorizedCount = assignments.filter((a) => a.source === 'default').length;

    const statementId = transaction(this.db, () => {
      const remove = this.db.prepare('DELETE FROM statements WHERE id = ?');
      for (const duplicate of duplicates) remove.run(duplicate.id);

      const { lastInsertRowid } = this.db
        .prepare(
          `INSERT INTO statements (bank, iban, year, month, opening_cents, closing_cents, file_hash, file_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          parsed.bank,
          parsed.iban,
          parsed.year,
          parsed.month,
          parsed.openingCents,
          parsed.closingCents,
          fileHash,
          fileName,
        );
      const insertTx = this.db.prepare(
        `INSERT INTO transactions (statement_id, booking_date, value_date, type, counterparty, purpose,
                                   amount_cents, category_id, category_source, rule_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      parsed.transactions.forEach((tx, index) => {
        const assignment = assignments[index]!;
        insertTx.run(
          lastInsertRowid,
          tx.bookingDate,
          tx.valueDate,
          tx.type,
          tx.counterparty,
          tx.purpose,
          tx.amountCents,
          assignment.categoryId,
          assignment.source,
          assignment.ruleId,
        );
      });
      return Number(lastInsertRowid);
    });

    // Dateien erst nach erfolgreichem Commit anfassen; ersetzte Dateien vor dem Schreiben entfernen.
    for (const row of duplicateRows) this.deleteFile(String(row['file_hash']));
    this.storeFile(fileHash, file);

    return {
      statement: this.getStatement(statementId),
      periodFrom: parsed.periodFrom,
      periodTo: parsed.periodTo,
      transactionCount: parsed.transactions.length,
      uncategorizedCount,
      sumCents,
      balanceOk,
      warnings,
    };
  }

  listStatements(): Statement[] {
    return this.db
      .prepare(`${STATEMENT_SELECT} ORDER BY s.year DESC, s.month DESC, s.iban`)
      .all()
      .map(toStatement);
  }

  getStatement(id: number): Statement {
    const row = this.db.prepare(`${STATEMENT_SELECT} WHERE s.id = ?`).get(id);
    if (!row) throw notFound('Kontoauszug nicht gefunden');
    return toStatement(row);
  }

  /** Löscht den Auszug inkl. Buchungen (ON DELETE CASCADE) und der gespeicherten PDF-Datei. */
  deleteStatement(id: number): void {
    const row = this.db.prepare('SELECT file_hash FROM statements WHERE id = ?').get(id);
    if (!row) throw notFound('Kontoauszug nicht gefunden');
    this.db.prepare('DELETE FROM statements WHERE id = ?').run(id);
    this.deleteFile(String(row['file_hash']));
  }

  private defaultCategorize(): Categorize {
    return () => {
      const row = this.db.prepare('SELECT id FROM categories WHERE is_default = 1').get();
      return { categoryId: row ? Number(row['id']) : null, source: 'default', ruleId: null };
    };
  }

  private filePath(fileHash: string): string | null {
    return this.uploadsDir ? join(this.uploadsDir, `${fileHash}.pdf`) : null;
  }

  private storeFile(fileHash: string, file: Uint8Array): void {
    const path = this.filePath(fileHash);
    if (!path) return;
    try {
      mkdirSync(this.uploadsDir!, { recursive: true });
      writeFileSync(path, file);
    } catch (error) {
      // Import bleibt gültig, nur das Original fehlt.
      console.error('PDF konnte nicht gespeichert werden:', error);
    }
  }

  private deleteFile(fileHash: string): void {
    const path = this.filePath(fileHash);
    if (path) rmSync(path, { force: true });
  }
}

function isPdf(file: Uint8Array): boolean {
  return file.length > 5 && Buffer.from(file.subarray(0, 1024)).includes('%PDF-');
}
