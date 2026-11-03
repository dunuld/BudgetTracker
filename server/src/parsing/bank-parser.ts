import type { TextLine } from './pdf-text.js';

export interface ParsedTransaction {
  /** ISO `yyyy-mm-dd` */
  bookingDate: string;
  valueDate: string;
  /** z. B. Lastschrift, Gutschrift, Ueberweisung */
  type: string;
  counterparty: string;
  purpose: string;
  amountCents: number;
}

export interface ParsedStatement {
  bank: 'ING';
  /** ohne Leerzeichen */
  iban: string;
  year: number;
  month: number;
  /** Zeitraum des Auszugs, ISO `yyyy-mm-dd` */
  periodFrom: string;
  periodTo: string;
  openingCents: number;
  closingCents: number;
  transactions: ParsedTransaction[];
}

/** Erkennt und liest den Kontoauszug einer Bank aus den rekonstruierten PDF-Zeilen. */
export interface BankParser {
  readonly bank: string;
  canParse(lines: TextLine[]): boolean;
  /** Wirft `StatementParseError`, wenn Pflichtangaben fehlen. */
  parse(lines: TextLine[]): ParsedStatement;
}

export class StatementParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatementParseError';
  }
}
