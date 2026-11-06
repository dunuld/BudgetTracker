import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Categorizer, compileRuleRegex } from '../src/categorization/categorizer.js';
import { openDatabase, type Database } from '../src/db/database.js';
import { DEFAULT_CATEGORY_NAME } from '../src/db/seed.js';
import { categoryId, insertTransactions } from './helpers.js';

let db: Database;
let categorizer: Categorizer;

beforeEach(() => {
  db = openDatabase(':memory:');
  categorizer = new Categorizer(db);
});
afterEach(() => db.close());

const tx = (counterparty: string, purpose = '') => ({ counterparty, purpose });
const categoryOf = (counterparty: string, purpose = '') => {
  const { categoryId: id } = categorizer.apply(tx(counterparty, purpose));
  return db.prepare('SELECT name FROM categories WHERE id = ?').get(id!)?.['name'];
};

describe('Categorizer.apply', () => {
  it('ordnet über contains-Regeln unabhängig von Groß-/Kleinschreibung zu', () => {
    expect(categoryOf('Rewe Markt GmbH')).toBe('Lebensmittel & Einkäufe');
    expect(categoryOf('PayPal', 'netflix.com Abo')).toBe('Streaming & Abos');
  });

  it('wertet Regex-Regeln mit Wortgrenzen korrekt aus (\\b darf nicht zu \\B werden)', () => {
    expect(categoryOf('ESSO STATION 1234')).toBe('Mobilität');
    expect(categoryOf('NETTO MARKEN-DISCOUNT')).toBe('Lebensmittel & Einkäufe');
    expect(categoryOf('dm-drogerie markt')).toBe('Drogerie');
    // Wortgrenze verhindert Fehltreffer
    expect(categoryOf('ESPRESSO BAR')).toBe(DEFAULT_CATEGORY_NAME);
  });

  it('beachtet Regex-Escapes wie \\d', () => {
    const cat = categoryId(db, 'Bargeld');
    db.prepare(
      `INSERT INTO rules (category_id, field, match_type, pattern, priority) VALUES (?, 'purpose', 'regex', ?, 1)`,
    ).run(cat, 'automat \\d{3}');
    expect(categoryOf('x', 'Automat 123')).toBe('Bargeld');
    expect(categoryOf('x', 'Automat abc')).toBe(DEFAULT_CATEGORY_NAME);
  });

  it('nimmt bei mehreren Treffern die Regel mit kleinster Priorität', () => {
    const cat = categoryId(db, 'Bargeld');
    db.prepare(`INSERT INTO rules (category_id, pattern, priority) VALUES (?, 'REWE', 1)`).run(cat);
    expect(categoryOf('REWE')).toBe('Bargeld');
  });

  it('prüft nur das konfigurierte Feld', () => {
    const cat = categoryId(db, 'Bargeld');
    db.prepare(
      `INSERT INTO rules (category_id, field, pattern, priority) VALUES (?, 'counterparty', 'NUR-EMPF', 1)`,
    ).run(cat);
    expect(categoryOf('NUR-EMPF')).toBe('Bargeld');
    expect(categoryOf('Jemand', 'NUR-EMPF')).toBe(DEFAULT_CATEGORY_NAME);
  });

  it('ignoriert ungültige Regex-Regeln statt abzustürzen', () => {
    const cat = categoryId(db, 'Bargeld');
    db.prepare(
      `INSERT INTO rules (category_id, match_type, pattern, priority) VALUES (?, 'regex', '(', 1)`,
    ).run(cat);
    expect(categorizer.apply(tx('REWE')).source).toBe('rule');
  });

  it('liefert die Fallback-Kategorie ohne Treffer', () => {
    expect(categorizer.apply(tx('Unbekannt'))).toEqual({
      categoryId: categoryId(db, DEFAULT_CATEGORY_NAME),
      source: 'default',
      ruleId: null,
    });
  });
});

describe('Categorizer.reapply', () => {
  it('ordnet neu zu, lässt manuelle Zuordnungen in Ruhe und zählt nur Änderungen', () => {
    const fallback = categoryId(db, DEFAULT_CATEGORY_NAME);
    const bargeld = categoryId(db, 'Bargeld');
    const [rewe, manual, unknown] = insertTransactions(db, [
      { date: '2026-10-01', counterparty: 'REWE', amountCents: -100, categoryId: fallback },
      {
        date: '2026-10-02',
        counterparty: 'REWE',
        amountCents: -100,
        categoryId: bargeld,
        source: 'manual',
      },
      { date: '2026-10-03', counterparty: 'Unbekannt', amountCents: -100, categoryId: fallback },
    ]);

    expect(categorizer.reapply()).toBe(1);
    const row = (id: number) => db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)!;
    expect(row(rewe!)).toMatchObject({
      category_id: categoryId(db, 'Lebensmittel & Einkäufe'),
      category_source: 'rule',
    });
    expect(row(manual!)).toMatchObject({ category_id: bargeld, category_source: 'manual' });
    // Ohne Treffer bleibt die Quelle "default" (nicht "rule")
    expect(row(unknown!)).toMatchObject({
      category_id: fallback,
      category_source: 'default',
      rule_id: null,
    });

    // Zweiter Lauf ändert nichts mehr
    expect(categorizer.reapply()).toBe(0);
  });

  it('setzt eine Buchung auf die Fallback-Kategorie zurück, wenn ihre Regel entfernt wurde', () => {
    const [id] = insertTransactions(db, [
      { date: '2026-10-01', counterparty: 'REWE', amountCents: -100 },
    ]);
    categorizer.reapply();
    db.prepare(`DELETE FROM rules WHERE pattern = 'REWE'`).run();
    // FK setzt rule_id auf NULL, Kategorie bleibt – reapply korrigiert die Quelle
    expect(categorizer.reapply()).toBe(1);
    expect(
      db.prepare('SELECT category_source FROM transactions WHERE id = ?').get(id!)?.[
        'category_source'
      ],
    ).toBe('default');
  });
});

describe('compileRuleRegex', () => {
  it('liefert null bei ungültigen Mustern', () => {
    expect(compileRuleRegex('(')).toBeNull();
    expect(compileRuleRegex('\\bREWE\\b')?.test('rewe markt')).toBe(true);
  });
});
