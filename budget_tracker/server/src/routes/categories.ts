import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { Category, CategoryInput, CategoryKind } from '../../../shared/api-types.js';
import { badRequest, conflict, isUniqueViolation, notFound, parseId } from '../http-error.js';

const KINDS: readonly CategoryKind[] = ['expense', 'income', 'transfer'];
const COLOR = /^#[0-9A-Fa-f]{6}$/;

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

/** Prüft die übergebenen Felder; bei `partial` dürfen Felder fehlen. */
function validate(input: Partial<CategoryInput>, partial: boolean): void {
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim())
      throw badRequest('Name ist erforderlich');
  }
  if (!partial || input.color !== undefined) {
    if (typeof input.color !== 'string' || !COLOR.test(input.color)) {
      throw badRequest('Ungültige Farbe (z. B. #4caf50)');
    }
  }
  if (!partial || input.kind !== undefined) {
    if (!KINDS.includes(input.kind as CategoryKind))
      throw badRequest('Ungültiger Typ (expense, income, transfer)');
  }
  if (input.sort !== undefined && !Number.isSafeInteger(input.sort)) {
    throw badRequest('sort muss eine Ganzzahl sein');
  }
}

/** Führt einen Schreibzugriff aus und übersetzt doppelte Namen in 409. */
function writeCategory<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (isUniqueViolation(error))
      throw conflict('Eine Kategorie mit diesem Namen existiert bereits', 'NAME_EXISTS');
    throw error;
  }
}

export function categoriesRouter(db: DatabaseSync): Router {
  const router = Router();
  const byId = (id: number) => db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

  router.get('/', (_req, res) => {
    res.json(db.prepare('SELECT * FROM categories ORDER BY sort, name').all().map(toCategory));
  });

  router.post('/', (req, res) => {
    const input = (req.body ?? {}) as CategoryInput;
    validate(input, false);

    const { lastInsertRowid } = writeCategory(() =>
      db
        .prepare('INSERT INTO categories (name, color, kind, sort) VALUES (?, ?, ?, ?)')
        .run(input.name.trim(), input.color, input.kind, input.sort ?? 0),
    );
    res.status(201).json(toCategory(byId(Number(lastInsertRowid))!));
  });

  router.get('/:id', (req, res) => {
    const row = byId(parseId(req.params['id']));
    if (!row) throw notFound('Kategorie nicht gefunden');
    res.json(toCategory(row));
  });

  router.patch('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const input = (req.body ?? {}) as Partial<CategoryInput>;
    validate(input, true);

    const existing = byId(id);
    if (!existing) throw notFound('Kategorie nicht gefunden');

    writeCategory(() =>
      db
        .prepare('UPDATE categories SET name = ?, color = ?, kind = ?, sort = ? WHERE id = ?')
        .run(
          input.name?.trim() ?? String(existing['name']),
          input.color ?? String(existing['color']),
          input.kind ?? String(existing['kind']),
          input.sort ?? Number(existing['sort']),
          id,
        ),
    );
    res.json(toCategory(byId(id)!));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const row = byId(id);
    if (!row) throw notFound('Kategorie nicht gefunden');
    if (Number(row['is_default']) === 1) {
      throw conflict('Die Standardkategorie kann nicht gelöscht werden', 'DEFAULT_CATEGORY');
    }
    // Der DB-Trigger setzt die Buchungen auf die Standardkategorie zurück.
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.status(204).end();
  });

  return router;
}
