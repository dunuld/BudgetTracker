/** Hilfsfunktionen für deutsche Beträge, Datumswerte und Monatsnamen. */

const AMOUNT_RE = /^([+-])?\s*(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?:\s*(?:€|EUR|Euro))?$/i;
const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export const GERMAN_MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

/** `-1.234,56` / `1.234,56 Euro` → `-123456` (Cent); `null`, wenn kein gültiger Betrag. */
export function parseAmountCents(text: string): number | null {
  const match = AMOUNT_RE.exec(text.trim());
  if (!match) return null;
  const [, sign, euros, cents] = match;
  const value = Number(euros!.replaceAll('.', '')) * 100 + Number(cents);
  return sign === '-' ? -value : value;
}

export function isAmount(text: string): boolean {
  return parseAmountCents(text) !== null;
}

/** `01.10.2026` → `2026-10-01`; `null` bei ungültigem Format oder Datum. */
export function parseGermanDate(text: string): string | null {
  const match = DATE_RE.exec(text.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function isGermanDate(text: string): boolean {
  return parseGermanDate(text) !== null;
}

/** `Oktober` → 10 (auch `Maerz`/`Marz`, ohne Beachtung der Groß-/Kleinschreibung); sonst `null`. */
export function parseGermanMonth(name: string): number | null {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace('ae', 'ä')
    .replace(/^marz$/, 'märz');
  const index = GERMAN_MONTHS.findIndex((m) => m.toLowerCase() === normalized);
  return index >= 0 ? index + 1 : null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** ISO-Datum des Monatsletzten, z. B. `2026-02-28`. */
export function lastDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
}

/**
 * Entfernt die Leerzeichen, die ING beim Aufteilen von SEPA-Feldern in 35-Zeichen-Blöcke einfügt
 * (z. B. `Lebensversicherung a uf` → `Lebensversicherung auf`).
 *
 * Steht am Blockende ein echtes Leerzeichen, verschmilzt es mit dem Trenner. Daher wird an jeder
 * Blockgrenze geprüft, welche Annahme (Trenner entfernen vs. Leerzeichen behalten) an der nächsten
 * Grenze wieder ein Leerzeichen ergibt. Ist das nicht prüfbar (letzter Block), bleibt das
 * Leerzeichen nur zwischen Klein- und Großbuchstabe erhalten (`bei Takeaway`), sonst wird es entfernt.
 */
export function removeChunkSpaces(text: string, size = 35): string {
  const isSpace = (index: number): boolean => text[index] === ' ';
  let out = '';
  let start = 0;
  while (start < text.length) {
    const end = start + size;
    out += text.slice(start, end);
    if (end >= text.length || !isSpace(end)) {
      start = end;
      continue;
    }
    let keepSpace: boolean;
    if (end + 1 + size < text.length) {
      keepSpace = !isSpace(end + 1 + size) && isSpace(end + size);
    } else {
      keepSpace = /\p{Ll}/u.test(text[end - 1] ?? '') && /\p{Lu}/u.test(text[end + 1] ?? '');
    }
    start = keepSpace ? end : end + 1;
  }
  return out;
}
