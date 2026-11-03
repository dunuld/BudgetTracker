import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { ParsedTransaction } from '../parsing/bank-parser.js';
import { Categorizer } from '../categorization/categorizer.js';
import { badRequest, notFound } from '../http-error.js';
import type { Rule, Transaction, TransactionPatch, TransactionPatchResult, TransactionQuery } from '../../../shared/api-types.js';

function toTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: Number(row['id']),
    statementId: Number(row['statement_id']),
    bookingDate: String(row['booking_date']),
    valueDate: String(row['value_date']),
    type: String(row['type']),
    counterparty: String(row['counterparty']),
    purpose: String(row['purpose']),
    amountCents: Number(row['amount_cents']),
    categoryId: row['category_id'] !== null ? Number(row['category_id']) : null,
    categorySource: String(row['category_source']) as Transaction['categorySource'],
    ruleId: row['rule_id'] !== null ? Number(row['rule_id']) : null,
  };
}

export function transactionsRouter(db: DatabaseSync): Router {
  const router = Router();
  const categorizer = new Categorizer(db);

  router.get('/', (req, res) => {
    const query = req.query as unknown as TransactionQuery;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.year && query.month) {
      const mm = String(query.month).padStart(2, '0');
      conditions.push('t.booking_date >= ? AND t.booking_date < ?');
      params.push(`${query.year}-${mm}-01`, nextMonth(query.year, query.month));
    }
    if (query.categoryId) {
      conditions.push('t.category_id = ?');
      params.push(query.categoryId);
    }
    if (query.q) {
      conditions.push('(t.counterparty LIKE ? OR t.purpose LIKE ?)');
      const like = `%${query.q}%`;
      params.push(like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT t.* FROM transactions t ${where} ORDER BY t.booking_date, t.id`,
      )
      .all(...params);
    res.json(rows.map(toTransaction));
  });

  router.patch('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const input = req.body as TransactionPatch;

    if (!input.categoryId) throw badRequest('categoryId ist erforderlich');

    const txRow = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!txRow) throw notFound('Transaktion nicht gefunden');

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(input.categoryId);
    if (!cat) throw notFound('Kategorie nicht gefunden');

    db.prepare(
      "UPDATE transactions SET category_id = ?, category_source = 'manual', rule_id = NULL WHERE id = ?",
    ).run(input.categoryId, id);

    const result: TransactionPatchResult = {
      transaction: toTransaction(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)!),
    };

    if (input.createRule) {
      const tx = toTransaction(txRow);
      const parsed: ParsedTransaction = {
        bookingDate: tx.bookingDate,
        valueDate: tx.valueDate,
        type: tx.type,
        counterparty: tx.counterparty,
        purpose: tx.purpose,
        amountCents: tx.amountCents,
      };
      const ruleId = categorizer.createRuleFromTransaction(parsed, input.categoryId);
      const ruleRow = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
      if (ruleRow) {
        result.rule = {
          id: Number(ruleRow['id']),
          categoryId: Number(ruleRow['category_id']),
          field: String(ruleRow['field']) as Rule['field'],
          matchType: String(ruleRow['match_type']) as Rule['matchType'],
          pattern: String(ruleRow['pattern']),
          priority: Number(ruleRow['priority']),
        };
      }
    }

    res.json(result);
  });

  return router;
}

function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw badRequest('Ungültige ID');
  return id;
}

function nextMonth(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}
