import type { DatabaseSync } from 'node:sqlite';
import type { CategorySource, RuleField } from '../../../shared/api-types.js';
import { transaction } from '../db/database.js';
import type { ParsedTransaction } from '../parsing/bank-parser.js';

export interface CategoryAssignment {
  categoryId: number | null;
  source: CategorySource;
  ruleId: number | null;
}

/**
 * Wendet die konfigurierten Regeln auf eine Buchung an.
 * Regeln werden nach Priorität (aufsteigend) geprüft; erste passende Regel gewinnt.
 * Ohne Treffer wird die Fallback-Kategorie verwendet.
 */
export class Categorizer {
  constructor(private readonly db: DatabaseSync) {}

  apply(tx: ParsedTransaction): CategoryAssignment {
    const rules = this.db
      .prepare(
        `SELECT id, category_id, field, match_type, pattern FROM rules ORDER BY priority, id`,
      )
      .all() as Array<{
      id: number;
      category_id: number;
      field: RuleField;
      match_type: 'contains' | 'regex';
      pattern: string;
    }>;

    for (const rule of rules) {
      if (this.matches(rule, tx)) {
        return { categoryId: rule.category_id, source: 'rule', ruleId: rule.id };
      }
    }

    const defaultRow = this.db.prepare('SELECT id FROM categories WHERE is_default = 1').get();
    return {
      categoryId: defaultRow ? Number(defaultRow['id']) : null,
      source: 'default',
      ruleId: null,
    };
  }

  /**
   * Wendet Regeln auf alle nicht-manuell zugeordneten Buchungen an.
   * Gibt die Anzahl der aktualisierten Buchungen zurück.
   */
  reapply(): number {
    return transaction(this.db, () => {
      let count = 0;
      const rows = this.db
        .prepare(
          `SELECT id, counterparty, purpose FROM transactions WHERE category_source != 'manual'`,
        )
        .all() as Array<{ id: number; counterparty: string; purpose: string }>;

      const updateStmt = this.db.prepare(
        `UPDATE transactions SET category_id = ?, category_source = 'rule', rule_id = ? WHERE id = ?`,
      );

      for (const row of rows) {
        const fakeTx: ParsedTransaction = {
          bookingDate: '',
          valueDate: '',
          type: '',
          counterparty: row.counterparty,
          purpose: row.purpose,
          amountCents: 0,
        };
        const assignment = this.apply(fakeTx);
        if (assignment.categoryId !== null) {
          updateStmt.run(assignment.categoryId, assignment.ruleId, row.id);
          count++;
        }
      }
      return count;
    });
  }

  /**
   * Erstellt eine neue Regel aus einer Buchung und einer Zielkategorie.
   * Die Regel passt auf den Empfänger (counterparty) mit contains-Match.
   */
  createRuleFromTransaction(tx: ParsedTransaction, categoryId: number): number {
    const { lastInsertRowid } = this.db
      .prepare(
        `INSERT INTO rules (category_id, field, match_type, pattern, priority) VALUES (?, 'counterparty', 'contains', ?, 100)`,
      )
      .run(categoryId, tx.counterparty.toUpperCase());
    return Number(lastInsertRowid);
  }

  private matches(
    rule: { field: RuleField; match_type: 'contains' | 'regex'; pattern: string },
    tx: ParsedTransaction,
  ): boolean {
    const text = this.getFieldText(rule.field, tx);
    if (!text) return false;
    const patternUpper = rule.pattern.toUpperCase();
    const textUpper = text.toUpperCase();

    if (rule.match_type === 'contains') {
      return textUpper.includes(patternUpper);
    }
    // regex
    try {
      const re = new RegExp(patternUpper, 'iu');
      return re.test(text);
    } catch {
      // Ungültige Regex → nie Treffer
      return false;
    }
  }

  private getFieldText(field: RuleField, tx: ParsedTransaction): string {
    switch (field) {
      case 'counterparty':
        return tx.counterparty;
      case 'purpose':
        return tx.purpose;
      case 'any':
        return `${tx.counterparty} ${tx.purpose}`;
    }
  }
}
