import { Router, type RequestHandler } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { Category, CategoryInput } from '../../../shared/api-types.js';
import { badRequest, notFound } from '../http-error.js';

function toCategory(row: Record<string, unknown>): Category {
  return {
    id: Number(row['id']),
    name: String(row['name']),
    color: String(row['color']),
    kind: String(row['kind']) as Category['kind'],
    sort: Number(row['sort']),
    isDefault: Number(row['is_default']) === 1,
  };
}

export function categoriesRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM categories ORDER BY sort, name')
      .all();
    res.json(rows.map(toCategory));
  });

  router.post('/', (req, res) => {
    const input = req.body as CategoryInput;
    if (!input.name?.trim()) throw badRequest('Name ist erforderlich');
    if (!input.color?.match(/^#[0-9A-Fa-f]{6}$/)) throw badRequest('Ungültige Farbe (z. B. #4caf50)');
    if (!['expense', 'income', 'transfer'].includes(input.kind)) {
      throw badRequest('Ungültiger Typ (expense, income, transfer)');
    }

    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO categories (name, color, kind, sort) VALUES (?, ?, ?, COALESCE(?, 0))",
      )
      .run(input.name.trim(), input.color, input.kind, input.sort ?? 0);

    res.status(201).json(toCategory({
      id: lastInsertRowid,
      name: input.name.trim(),
      color: input.color,
      kind: input.kind,
      sort: input.sort ?? 0,
      is_default: 0,
    }));
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!row) throw notFound('Kategorie nicht gefunden');
    res.json(toCategory(row));
  });

  router.patch('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const input = req.body as Partial<CategoryInput>;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw notFound('Kategorie nicht gefunden');

    const name = input.name?.trim() || String(existing['name']);
    const color = input.color || String(existing['color']);
    const kind = input.kind || String(existing['kind']);

    if (name.trim()) {
      db.prepare('UPDATE categories SET name = ?, color = ?, kind = ? WHERE id = ?')
        .run(name.trim(), color, kind, id);
    }

    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(toCategory(row!));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!row) throw notFound('Kategorie nicht gefunden');
    // Der DB-Trigger sorgt für die Rücksetzung der Buchungen auf "Sonstiges"
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.status(204).end();
  });

  return router;
}

function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw badRequest('Ungültige ID');
  return id;
}
