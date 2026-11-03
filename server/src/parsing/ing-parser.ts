import {
  lastDayOfMonth,
  parseAmountCents,
  parseGermanDate,
  parseGermanMonth,
  removeChunkSpaces,
} from './amount.js';
import {
  StatementParseError,
  type BankParser,
  type ParsedStatement,
  type ParsedTransaction,
} from './bank-parser.js';
import type { TextLine } from './pdf-text.js';

/** Spaltengrenzen des ING-Layouts (PDF-Punkte, A4). */
const DATE_COLUMN_MAX_X = 110;
const TEXT_COLUMN_MIN_X = 130;
const FOOTER_MAX_X = 60;
const AMOUNT_MIN_RIGHT = 470;
/** Ungefähre Zeichenzahl, ab der ING die Kopfzeile einer Buchung umbricht. */
const HEAD_WRAP_CHARS = 56;
/** SEPA-Namen/-Texte werden in Blöcken dieser Länge geliefert. */
const SEPA_CHUNK = 35;

const STRUCTURED_DETAIL_RE = /^(Mandat|Referenz|Gl(?:ä|ae)ubiger-ID|Mandatsreferenz):/i;
const CARD_DETAIL_RE = /^NR X{4} \d{4}\b/;

interface Draft {
  bookingDate: string;
  valueDate: string | null;
  type: string;
  counterparty: string;
  amountCents: number;
  /** Text der Valuta-Zeile (zweite Zeile einer Buchung), ggf. leer */
  valueLineText: string | null;
  details: string[];
}

const first = (line: TextLine) => line.segments[0]!;
const last = (line: TextLine) => line.segments.at(-1)!;

const isDateCell = (line: TextLine): boolean =>
  first(line).x < DATE_COLUMN_MAX_X && parseGermanDate(first(line).text) !== null;

const isColumnHeader = (line: TextLine): boolean => /Buchung \/ Verwendungszweck/.test(line.text);

const isFooter = (line: TextLine): boolean =>
  first(line).x < FOOTER_MAX_X || /^ING-DiBa AG\s*·/.test(line.text);

export class IngParser implements BankParser {
  readonly bank = 'ING';

  canParse(lines: TextLine[]): boolean {
    const isIng = lines.some((l) => /ING-DiBa|INGDDEFF/.test(l.text));
    const isStatement = lines.some((l) => /^Kontoauszug\s+\S+\s+\d{4}$/.test(l.text));
    return isIng && isStatement;
  }

  parse(lines: TextLine[]): ParsedStatement {
    const header = this.parseHeader(lines);
    const transactions = this.parseTransactions(lines);
    const mm = String(header.month).padStart(2, '0');
    const sameMonth = header.statementDate?.startsWith(`${header.year}-${mm}-`);
    return {
      bank: 'ING',
      iban: header.iban,
      year: header.year,
      month: header.month,
      periodFrom: `${header.year}-${mm}-01`,
      periodTo: sameMonth ? header.statementDate! : lastDayOfMonth(header.year, header.month),
      openingCents: header.openingCents,
      closingCents: header.closingCents,
      transactions,
    };
  }

  private parseHeader(lines: TextLine[]) {
    const find = (re: RegExp): RegExpExecArray | null => {
      for (const line of lines) {
        const match = re.exec(line.text);
        if (match) return match;
      }
      return null;
    };

    const ibanMatch = find(/^IBAN\s+([A-Z]{2}\d{2}(?:\s?[0-9A-Z]{1,4})+)$/);
    if (!ibanMatch) throw new StatementParseError('IBAN nicht gefunden');

    const periodMatch = find(/^Kontoauszug\s+(\S+)\s+(\d{4})$/);
    const month = periodMatch ? parseGermanMonth(periodMatch[1]!) : null;
    if (!periodMatch || !month) throw new StatementParseError('Monat des Kontoauszugs nicht gefunden');

    const opening = find(/^Alter Saldo\s+(.+)$/);
    const openingCents = opening ? parseAmountCents(opening[1]!) : null;
    if (openingCents === null) throw new StatementParseError('Alter Saldo nicht gefunden');

    const closing = find(/^Neuer Saldo\s+(.+)$/);
    const closingCents = closing ? parseAmountCents(closing[1]!) : null;
    if (closingCents === null) throw new StatementParseError('Neuer Saldo nicht gefunden');

    const dateMatch = find(/^Datum\s+(\d{2}\.\d{2}\.\d{4})$/);

    return {
      iban: ibanMatch[1]!.replace(/\s+/g, ''),
      year: Number(periodMatch[2]),
      month,
      openingCents,
      closingCents,
      statementDate: dateMatch ? parseGermanDate(dateMatch[1]!) : null,
    };
  }

  private parseTransactions(lines: TextLine[]): ParsedTransaction[] {
    const result: ParsedTransaction[] = [];
    let draft: Draft | null = null;
    let page = 0;
    let inTable = false;
    let finished = false;

    const flush = () => {
      if (draft) result.push(finalize(draft));
      draft = null;
    };

    for (const line of lines) {
      if (finished) break;
      if (line.page !== page) {
        page = line.page;
        inTable = false;
      }
      if (!inTable) {
        // Buchungen beginnen auf jeder Seite erst nach dem Spaltenkopf.
        if (isColumnHeader(line)) inTable = true;
        continue;
      }
      if (line.text === 'Valuta' || isFooter(line)) continue;
      if (/^Neuer Saldo\b/.test(line.text)) {
        finished = true;
        continue;
      }

      const booking = parseBookingHead(line);
      if (booking) {
        flush();
        draft = booking;
        continue;
      }
      if (!draft) continue;
      const current: Draft = draft;

      if (current.valueDate === null && current.details.length === 0 && isDateCell(line)) {
        current.valueDate = parseGermanDate(first(line).text);
        current.valueLineText = line.segments.slice(1).map((s) => s.text).join(' ');
        continue;
      }
      if (first(line).x >= TEXT_COLUMN_MIN_X) {
        current.details.push(line.text);
      }
    }
    flush();
    return result;
  }
}

/** Kopfzeile einer Buchung: Datum | Art | Empfänger … | Betrag */
function parseBookingHead(line: TextLine): Draft | null {
  if (line.segments.length < 3 || !isDateCell(line)) return null;
  const amountSegment = last(line);
  if (amountSegment.right < AMOUNT_MIN_RIGHT) return null;
  const amountCents = parseAmountCents(amountSegment.text);
  if (amountCents === null) return null;

  const middle = line.segments.slice(1, -1);
  let type: string;
  let counterparty: string;
  if (middle.length >= 2) {
    type = middle[0]!.text;
    counterparty = middle.slice(1).map((s) => s.text).join(' ');
  } else {
    const [head = '', ...rest] = middle[0]!.text.split(' ');
    type = head;
    counterparty = rest.join(' ');
  }

  return {
    bookingDate: parseGermanDate(first(line).text)!,
    valueDate: null,
    type,
    counterparty,
    amountCents,
    valueLineText: null,
    details: [],
  };
}

function finalize(draft: Draft): ParsedTransaction {
  const valueLine = draft.valueLineText?.trim() ?? '';
  const isCard = /^VISA\s/i.test(draft.counterparty) || CARD_DETAIL_RE.test(valueLine);
  let counterparty = draft.counterparty;
  const textLines = valueLine ? [valueLine, ...draft.details] : [...draft.details];

  // Lange Empfängernamen brechen in die Valuta-Zeile um (z. B. "… Lebensversicherung a uf" / "Gegenseitigkeit").
  if (!isCard && valueLine && isNameContinuation(draft.type, counterparty, valueLine)) {
    counterparty = `${counterparty} ${valueLine}`;
    textLines.shift();
  }

  const structured = textLines.filter((t) => STRUCTURED_DETAIL_RE.test(t));
  const text = textLines.filter((t) => !STRUCTURED_DETAIL_RE.test(t)).join(' ');

  return {
    bookingDate: draft.bookingDate,
    valueDate: draft.valueDate ?? draft.bookingDate,
    type: draft.type,
    counterparty: isCard ? counterparty : removeChunkSpaces(counterparty, SEPA_CHUNK),
    purpose: [isCard ? text : removeChunkSpaces(text, SEPA_CHUNK), ...structured]
      .filter(Boolean)
      .join(' · '),
    amountCents: draft.amountCents,
  };
}

/**
 * Heuristik: Die Valuta-Zeile setzt den Namen fort, wenn der Name bereits einen zweiten SEPA-Block
 * hat, die Zeile wie ein Namensteil aussieht (keine Ziffern) und der Umbruch erzwungen war.
 */
function isNameContinuation(type: string, counterparty: string, valueLine: string): boolean {
  if (counterparty.length <= SEPA_CHUNK) return false;
  if (!/^[\p{L}][\p{L}\s.&'+-]*$/u.test(valueLine)) return false;
  const firstWord = valueLine.split(' ')[0]!;
  return type.length + 1 + counterparty.length + 1 + firstWord.length > HEAD_WRAP_CHARS;
}
