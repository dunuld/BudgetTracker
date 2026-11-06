import type { DatabaseSync } from 'node:sqlite';
import type {
  CategoryKind,
  CategoryTotal,
  MonthlyReport,
  TrendMonth,
  TrendReport,
} from '../../../shared/api-types.js';

/**
 * Berechnet Monats- und Trendberichte aus den gespeicherten Transaktionen.
 * Umbuchungen (kind = 'transfer') werden ausgeschlossen.
 */
export class ReportService {
  constructor(private readonly db: DatabaseSync) {}

  /** Monatsübersicht: Einnahmen, Ausgaben, Saldo und Summen je Kategorie. */
  monthly(year: number, month: number): MonthlyReport {
    const categories = this.db
      .prepare(
        `SELECT c.id, c.name, c.color, c.kind,
                COALESCE(SUM(t.amount_cents), 0) AS total_cents,
                COUNT(t.id) AS count
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id
           AND t.booking_date >= ? AND t.booking_date < ?
         WHERE c.kind != 'transfer'
         GROUP BY c.id
         ORDER BY c.sort, c.name`,
      )
      .all(`${year}-${String(month).padStart(2, '0')}-01`, this.nextMonth(year, month)) as Array<{
      id: number;
      name: string;
      color: string;
      kind: CategoryKind;
      total_cents: number;
      count: number;
    }>;

    let incomeCents = 0;
    let expenseCents = 0;
    const categoryTotals: CategoryTotal[] = categories.map((row) => {
      const totalCents = Number(row['total_cents']);
      if (row.kind === 'income') incomeCents += totalCents;
      else if (row.kind === 'expense') expenseCents += totalCents;
      return {
        categoryId: Number(row['id']),
        name: row.name,
        color: row.color,
        kind: row.kind,
        totalCents,
        count: Number(row['count']),
      };
    });

    return {
      year,
      month,
      incomeCents,
      expenseCents,
      balanceCents: incomeCents + expenseCents,
      categories: categoryTotals,
    };
  }

  /**
   * Trend über mehrere Monate: gestapelte Ausgaben je Kategorie.
   * from/to im Format `YYYY-MM`.
   */
  trend(from: string, to: string): TrendReport {
    // Kategorien laden (ohne Umbuchungen)
    const categories = this.db
      .prepare(
        "SELECT id, name, color, kind FROM categories WHERE kind != 'transfer' ORDER BY sort, name",
      )
      .all() as Array<{ id: number; name: string; color: string; kind: CategoryKind }>;

    const months: TrendMonth[] = [];
    let current = from;
    while (current <= to) {
      const [y, m] = current.split('-').map(Number);
      const next = this.nextMonthStr(y, m);

      const totals = this.db
        .prepare(
          `SELECT t.category_id, SUM(t.amount_cents) AS total_cents
           FROM transactions t
           WHERE t.booking_date >= ? AND t.booking_date < ?
           GROUP BY t.category_id
           HAVING total_cents != 0`,
        )
        .all(`${y}-${String(m).padStart(2, '0')}-01`, next) as Array<{
        category_id: number;
        total_cents: number;
      }>;

      months.push({
        month: current,
        totals: totals.map((t) => ({
          categoryId: Number(t['category_id']),
          totalCents: Number(t['total_cents']),
        })),
      });

      current = next;
    }

    return { from, to, categories, months };
  }

  private nextMonth(year: number, month: number): string {
    return this.nextMonthStr(year, month);
  }

  private nextMonthStr(year: number, month: number): string {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }
}
