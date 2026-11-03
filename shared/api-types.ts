/**
 * Gemeinsame DTOs für Server (server/src) und Angular-Frontend (src/app).
 * Nur Typen – diese Datei darf keinen Laufzeitcode enthalten.
 * Alle Beträge sind vorzeichenbehaftete Integer-Cent (Ausgaben negativ).
 * Datumswerte sind ISO-Strings `yyyy-mm-dd`, Zeitstempel ISO-8601.
 */

export type CategoryKind = 'expense' | 'income' | 'transfer';

export interface Category {
  id: number;
  name: string;
  /** Hex-Farbe, z. B. `#4caf50` */
  color: string;
  kind: CategoryKind;
  sort: number;
  /** Fallback-Kategorie ("Sonstiges"); genau eine, nicht löschbar */
  isDefault: boolean;
}

export interface CategoryInput {
  name: string;
  color: string;
  kind: CategoryKind;
  sort?: number;
}

/** `any` = Empfänger oder Verwendungszweck */
export type RuleField = 'counterparty' | 'purpose' | 'any';
export type RuleMatchType = 'contains' | 'regex';

export interface Rule {
  id: number;
  categoryId: number;
  field: RuleField;
  matchType: RuleMatchType;
  /** Vergleich immer ohne Beachtung der Groß-/Kleinschreibung */
  pattern: string;
  /** Kleinere Zahl = wird zuerst geprüft; erste passende Regel gewinnt */
  priority: number;
}

export interface RuleInput {
  categoryId: number;
  field: RuleField;
  matchType: RuleMatchType;
  pattern: string;
  priority?: number;
}

export interface Statement {
  id: number;
  bank: string;
  iban: string;
  year: number;
  month: number;
  openingCents: number;
  closingCents: number;
  fileName: string;
  importedAt: string;
  transactionCount: number;
}

export type CategorySource = 'rule' | 'manual' | 'default';

export interface Transaction {
  id: number;
  statementId: number;
  bookingDate: string;
  valueDate: string;
  type: string;
  counterparty: string;
  purpose: string;
  amountCents: number;
  categoryId: number | null;
  categorySource: CategorySource;
  ruleId: number | null;
}

export interface TransactionQuery {
  year?: number;
  month?: number;
  categoryId?: number;
  q?: string;
}

export interface TransactionPatch {
  categoryId: number;
  /** Legt zusätzlich eine Regel für den Empfänger dieser Buchung an */
  createRule?: boolean;
}

export interface TransactionPatchResult {
  transaction: Transaction;
  rule?: Rule;
}

export interface ImportResult {
  statement: Statement;
  /** Zeitraum des Auszugs (ISO-Datum) */
  periodFrom: string;
  periodTo: string;
  transactionCount: number;
  uncategorizedCount: number;
  /** Summe aller Buchungen */
  sumCents: number;
  /** true, wenn Summe der Buchungen = Neuer Saldo − Alter Saldo */
  balanceOk: boolean;
  warnings: string[];
}

export interface ReapplyResult {
  updated: number;
}

export interface CategoryTotal {
  categoryId: number;
  name: string;
  color: string;
  kind: CategoryKind;
  totalCents: number;
  count: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  incomeCents: number;
  /** negativ */
  expenseCents: number;
  balanceCents: number;
  categories: CategoryTotal[];
}

export interface TrendMonth {
  /** `YYYY-MM` */
  month: string;
  totals: { categoryId: number; totalCents: number }[];
}

export interface TrendReport {
  from: string;
  to: string;
  categories: Pick<Category, 'id' | 'name' | 'color' | 'kind'>[];
  months: TrendMonth[];
}

export interface HealthResponse {
  status: 'ok';
  version: string;
}

export interface ApiError {
  error: string;
  /** Maschinenlesbarer Code, z. B. `DUPLICATE_STATEMENT` */
  code?: string;
  /** Bei Duplikat: der bereits vorhandene Auszug */
  existing?: Statement;
}
