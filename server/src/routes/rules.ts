import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { ReapplyResult, Rule, RuleInput } from '../../../shared/api-types.js';
import { Categorizer } from '../categorization/categorizer.js';
import { badRequest, notFound } from '../http-error.js';

function toRule(row: Record<string, unknown>): Rule {
  return {
    id: Number(row['id']),
    categoryId: Number(row['category_id']),
    field: String(row['field']) as Rule['field'],
    matchType: String(row['match_type']) as Rule['matchType'],
    pattern: String(row['pattern']),
    priority: Number(row['priority']),
  };
}

export function rulesRouter(db: DatabaseSync): Router {
  const router = Router();
  const categorizer = new Categorizer(db);

  router.get('/', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM rules ORDER BY priority, id')
      .all();
    res.json(rows.map(toRule));
  });

  router.post('/', (req, res) => {
    const input = req.body as RuleInput;
    if (!input.pattern?.trim()) throw badRequest('Muster ist erforderlich');
    if (!input.categoryId) throw badRequest('Kategorie ist erforderlich');

    // Regex-Validierung
    if (input.matchType === 'regex') {
      try {
        new RegExp(input.pattern);
      } catch {
        throw badRequest('Ungültiges Regex-Muster');
      }
    }

    // Kategorie existiert?
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(input.categoryId);
    if (!cat) throw notFound('Kategorie nicht gefunden');

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO rules (category_id, field, match_type, pattern, priority)
         VALUES (?, ?, ?, ?, COALESCE(?, 100))`,
      )
      .run(input.categoryId, input.field ?? 'any', input.matchType ?? 'contains', input.pattern.trim(), input.priority ?? 100);

    res.status(201).json(toRule({
      id: lastInsertRowid,
      category_id: input.categoryId,
      field: input.field ?? 'any',
      match_type: input.matchType ?? 'contains',
      pattern: input.pattern.trim(),
      priority: input.priority ?? 100,
    }));
  });

  router.post('/reapply', (_req, res) => {
    const updated = categorizer.reapply();
    const result: ReapplyResult = { updated };
    res.json(result);
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    if (!row) throw notFound('Regel nicht gefunden');
    res.json(toRule(row));
  });

  router.patch('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const input = req.body as Partial<RuleInput & { pattern?: string; priority?: number }>;

    const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    if (!existing) throw notFound('Regel nicht gefunden');

    const categoryId = input.categoryId || Number(existing['category_id']);
    const field = input.field || String(existing['field']);
    const matchType = input.matchType || String(existing['match_type']);
    const pattern = input.pattern?.trim() || String(existing['pattern']);
    const priority = input.priority ?? Number(existing['priority']);

    if (!pattern) throw badRequest('Muster ist erforderlich');

    // Regex-Validierung
    if (matchType === 'regex') {
      try {
        new RegExp(pattern);
      } catch {
        throw badRequest('Ungültiges Regex-Muster');
      }
    }

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!cat) throw notFound('Kategorie nicht gefunden');

    db.prepare(
      'UPDATE rules SET category_id = ?, field = ?, match_type = ?, pattern = ?, priority = ? WHERE id = ?',
    ).run(categoryId, field, matchType, pattern, priority, id);

    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    res.json(toRule(row!));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params['id']);
    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    if (!row) throw notFound('Regel nicht gefunden');
    db.prepare('DELETE FROM rules WHERE id = ?').run(id);
    res.status(204).end();
  });

  return router;
}

function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw badRequest('Ungültige ID');
  return id;
}
