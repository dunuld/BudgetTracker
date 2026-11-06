/** Erster Tag des Monats als ISO-Datum (`2026-03-01`). */
export function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Erster Tag des Folgemonats als ISO-Datum (`2026-12` → `2027-01-01`). */
export function nextMonthStart(year: number, month: number): string {
  return month === 12 ? monthStart(year + 1, 1) : monthStart(year, month + 1);
}
