import type { DatabaseSync } from 'node:sqlite';
import type { CategoryKind, RuleField, RuleMatchType } from '../../../shared/api-types.js';

export const DEFAULT_CATEGORY_NAME = 'Sonstiges';

interface SeedRule {
  pattern: string;
  field?: RuleField;
  matchType?: RuleMatchType;
  priority?: number;
}

interface SeedCategory {
  name: string;
  color: string;
  kind: CategoryKind;
  rules: SeedRule[];
}

const contains = (pattern: string, priority = 50, field: RuleField = 'any'): SeedRule => ({
  pattern,
  priority,
  field,
  matchType: 'contains',
});

// Kurze Kürzel als Regex mit Wortgrenzen, damit z. B. "ESSO" nicht in "ESPRESSO" trifft.
const word = (pattern: string, priority = 50, field: RuleField = 'any'): SeedRule => ({
  pattern: `\\b${pattern}\\b`,
  priority,
  field,
  matchType: 'regex',
});

/**
 * Vordefinierte Kategorien und Regeln. Prioritäten: kleinere Zahl wird zuerst geprüft.
 * 10 Umbuchungen, 20 Einnahmen, 30 spezifische Abos, 50 Händler, 60 generische Begriffe, 80–90 Sammeldienste.
 */
export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Lebensmittel & Einkäufe',
    color: '#4caf50',
    kind: 'expense',
    rules: [
      contains('REWE'),
      contains('EDEKA'),
      contains('ALDI'),
      contains('LIDL'),
      contains('KAUFLAND'),
      word('NETTO', 50, 'counterparty'),
      contains('PENNY'),
    ],
  },
  {
    name: 'Drogerie',
    color: '#e91e63',
    kind: 'expense',
    rules: [word('DM', 50, 'counterparty'), contains('DM-DROGERIE'), contains('ROSSMANN')],
  },
  {
    name: 'Streaming & Abos',
    color: '#9c27b0',
    kind: 'expense',
    rules: [
      contains('NETFLIX', 30),
      contains('SPOTIFY', 30),
      contains('DISNEY', 30),
      contains('DAZN', 30),
      contains('YOUTUBE', 30),
      contains('AMAZON PRIME', 30),
      contains('PRIME VIDEO', 30),
    ],
  },
  {
    name: 'Versicherungen',
    color: '#3f51b5',
    kind: 'expense',
    rules: [
      contains('ALLIANZ'),
      contains('HUK'),
      word('ERGO'),
      word('AXA'),
      contains('DEVK'),
      contains('VERSICHERUNG', 60),
    ],
  },
  {
    name: 'Wohnen & Miete',
    color: '#795548',
    kind: 'expense',
    rules: [contains('MIETE', 60), contains('HAUSGELD', 60), contains('NEBENKOSTEN', 60)],
  },
  {
    name: 'Energie',
    color: '#ff9800',
    kind: 'expense',
    rules: [contains('STADTWERKE'), contains('E.ON'), contains('VATTENFALL')],
  },
  {
    name: 'Telekommunikation',
    color: '#00bcd4',
    kind: 'expense',
    rules: [
      contains('TELEKOM'),
      contains('VODAFONE'),
      word('O2'),
      contains('TELEFONICA'),
      contains('1&1'),
    ],
  },
  {
    name: 'Mobilität',
    color: '#607d8b',
    kind: 'expense',
    rules: [word('ARAL'), contains('SHELL'), word('ESSO'), contains('DB VERTRIEB')],
  },
  {
    name: 'Online-Shopping',
    color: '#ff5722',
    kind: 'expense',
    rules: [contains('AMAZON', 80), contains('PAYPAL', 90)],
  },
  {
    name: 'Gesundheit',
    color: '#f44336',
    kind: 'expense',
    rules: [contains('APOTHEKE')],
  },
  {
    name: 'Bargeld',
    color: '#8bc34a',
    kind: 'expense',
    rules: [
      contains('GELDAUTOMAT', 40),
      contains('BARGELDAUSZAHLUNG', 40),
      contains('BARGELD', 45),
    ],
  },
  {
    name: 'Einnahmen',
    color: '#2e7d32',
    kind: 'income',
    rules: [
      contains('GEHALT', 20),
      word('LOHN', 20),
      contains('KINDERGELD', 20),
      contains('FAMILIENKASSE', 20),
    ],
  },
  {
    name: 'Umbuchungen',
    color: '#9e9e9e',
    kind: 'transfer',
    rules: [contains('UMBUCHUNG', 10), contains('ÜBERTRAG', 10), contains('UEBERTRAG', 10)],
  },
  {
    name: DEFAULT_CATEGORY_NAME,
    color: '#bdbdbd',
    kind: 'expense',
    rules: [],
  },
];

/** Legt Standardkategorien und -regeln an. Nur bei der Erstinitialisierung aufrufen. */
export function seedDefaults(db: DatabaseSync): void {
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, color, kind, sort, is_default) VALUES (?, ?, ?, ?, ?)',
  );
  const insertRule = db.prepare(
    'INSERT INTO rules (category_id, field, match_type, pattern, priority) VALUES (?, ?, ?, ?, ?)',
  );
  SEED_CATEGORIES.forEach((category, index) => {
    const isDefault = category.name === DEFAULT_CATEGORY_NAME ? 1 : 0;
    const { lastInsertRowid } = insertCategory.run(
      category.name,
      category.color,
      category.kind,
      (index + 1) * 10,
      isDefault,
    );
    for (const rule of category.rules) {
      insertRule.run(
        lastInsertRowid,
        rule.field ?? 'any',
        rule.matchType ?? 'contains',
        rule.pattern,
        rule.priority ?? 50,
      );
    }
  });
}

/**
 * Stellt sicher, dass genau eine Fallback-Kategorie existiert (bei jedem Start).
 * Gibt deren ID zurück.
 */
export function ensureDefaultCategory(db: DatabaseSync): number {
  const existing = db.prepare('SELECT id FROM categories WHERE is_default = 1').get();
  if (existing) return Number(existing['id']);

  const byName = db.prepare('SELECT id FROM categories WHERE name = ?').get(DEFAULT_CATEGORY_NAME);
  if (byName) {
    db.prepare('UPDATE categories SET is_default = 1 WHERE id = ?').run(byName['id']);
    return Number(byName['id']);
  }
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO categories (name, color, kind, sort, is_default) VALUES (?, '#bdbdbd', 'expense', 9999, 1)",
    )
    .run(DEFAULT_CATEGORY_NAME);
  return Number(lastInsertRowid);
}
