/** Formatiert Integer-Cent als `1.234,56 €` (de-DE). */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Formatiert ein ISO-Datum `yyyy-mm-dd` als `01.10.2026`. */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Monatsname, z. B. `Oktober 2026`. */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
}
