import { join } from 'node:path';

/** Synthetische ING-Kontoauszug-PDF mit Testdaten (2 Seiten, 19 Buchungen). */
export const SYNTHETIC_ING_PDF = join(import.meta.dirname, 'fixtures/synthetic-ing.pdf');

/** Minimales, gültiges PDF mit einer Textzeile (kein Kontoauszug). */
export function minimalPdf(text = 'Hallo Welt'): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

// ---------------------------------------------------------------------------
// Synthetische ING-Kontoauszug-PDF (via pdf-lib)
// ---------------------------------------------------------------------------
// Erzeugt eine mehrseitige PDF, die wie ein echter ING-Girokonto-Kontoauszug
// aussieht.  pdfjs-dist extrahiert Text mit x/y-Koordinaten; der ING-Parser
// erwartet bestimmte Spaltenpositionen (PDF-Punkte, A4-Hochformat).
//
// Spalten (x in PDF-Punkten, links=0):
//   Datum:       71
//   Art:         142
//   Empfänger:   192 (bzw. 195)
//   Betrag:      right ≥ 470  (x = 553 − text.length * 5)
//
// Y-Koordinaten (Grundlinie, größer = weiter oben):
//   Kopfzeilen:  748 … 637
//   Buchungen:   620 … 100 (Schritt 12)
//   Fußzeilen:   70, 41

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Betrag rechtsbündig in der Betragsspalte (right ≥ 470) */
function amountX(text: string): number {
  return 553 - text.length * 5;
}

const black = rgb(0, 0, 0);

/**
 * Erstelle eine synthetische ING-Kontoauszug-PDF mit Testdaten.
 * Die PDF enthält 2 Seiten mit verschiedenen Buchungstypen.
 */
export async function createSyntheticIngPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // ---- Seite 1: Header + Buchungen ----
  const page1 = doc.addPage([595, 842]);
  let y = 748;

  const draw = (p: typeof page1, text: string, x: number, yPos: number, size = 10) => {
    p.drawText(text, { x, y: yPos, size, font, color: black });
  };

  // Bank-Header (für canParse: ING-DiBa + Kontoauszug)
  draw(page1, 'ING-DiBa AG · Theodor-Heuss-Allee 2 · 60486 Frankfurt am Main', 71, y);
  y -= 12;
  draw(page1, 'Girokonto Nummer 5435728801', 71, y);
  y -= 12;
  draw(page1, 'Kontoauszug Oktober 2026', 71, y);
  y -= 36;

  // Kontodaten (Summe aller Buchungen = 3.110,34 €; Neuer Saldo = 1.200,00 + 3.110,34 = 4.310,34 €)
  draw(page1, 'Alter Saldo', 312, y);
  draw(page1, '1.200,00 Euro', amountX('1.200,00 Euro'), y);
  y -= 12;
  draw(page1, 'Neuer Saldo', 312, y);
  draw(page1, '4.310,34 Euro', amountX('4.310,34 Euro'), y);
  y -= 12;
  draw(page1, 'IBAN', 312, y);
  draw(page1, 'DE58 5001 0517 5435 7288 01', 408, y);
  y -= 12;
  draw(page1, 'Datum', 425, y);
  draw(page1, '31.10.2026', 500, y);
  y -= 12;
  draw(page1, 'Seite', 425, y);
  draw(page1, '1 von 2', 519, y);
  y -= 24;

  // Spaltenkopf
  draw(page1, 'Buchung', 71, y);
  draw(page1, 'Buchung / Verwendungszweck', 142, y);
  draw(page1, 'Betrag (EUR)', 494, y);
  y -= 13;
  draw(page1, 'Valuta', 71, y);
  y -= 23;

  // ---- Buchungen Seite 1 ----
  // 1. Dauerauftrag/Terminueberw. — Anna Bergmann / Sparen
  draw(page1, '01.10.2026', 71, y);
  draw(page1, 'Dauerauftrag/Terminueberw.', 142, y);
  draw(page1, 'Anna Bergmann', 192, y);
  draw(page1, '-1.250,50', amountX('-1.250,50'), y);
  y -= 12;
  draw(page1, 'Sparen', 142, y);
  y -= 12;

  // 2. Lastschrift — Rundfunk ARD, ZDF, DRadio
  draw(page1, '01.10.2026', 71, y);
  draw(page1, 'Lastschrift', 142, y);
  draw(page1, 'Rundfunk ARD, ZDF, DRadio', 192, y);
  draw(page1, '-62,35', amountX('-62,35'), y);
  y -= 12;
  draw(page1, 'Rundfunkbeitrag Q3 2026', 142, y);
  y -= 12;

  // 3. Lastschrift — Techniker Krankenkasse (mehrzeilig)
  draw(page1, '05.10.2026', 71, y);
  draw(page1, 'Lastschrift', 142, y);
  draw(page1, 'Techniker Krankenkasse', 195, y);
  draw(page1, '-875,43', amountX('-875,43'), y);
  y -= 12;
  draw(page1, 'TK-BuchNr 01808868096 Monat 09/26', 142, y);
  y -= 12;
  draw(page1, 'G184765629 Beitraege', 142, y);
  y -= 12;
  draw(page1, 'Mandat: MD9909586R3', 142, y);
  y -= 12;
  draw(page1, 'Referenz: 1808868096', 142, y);
  y -= 12;

  // 4. Gutschrift — Anna Bergmann (Einzahlung, kein Verwendungszweck)
  draw(page1, '10.10.2026', 71, y);
  draw(page1, 'Gutschrift', 142, y);
  draw(page1, 'Anna Bergmann', 192, y);
  draw(page1, '2.750,75', amountX('2.750,75'), y);
  y -= 12;

  // 5. VISA-Kartenzahlung — REWE (4 Buchungen)
  const rewePurposes = [
    'NR XXXX 4019 FORCHHEIM DE KAUFUMSATZ 29.09 58.91 161734 ARN74830726272312344870044 Apple Pay',
    'NR XXXX 4019 NUERNBERG DE KAUFUMSATZ 01.10 42.15 161735 ARN74830726272312344870045 Apple Pay',
    'NR XXXX 4019 ERLANGEN DE KAUFUMSATZ 05.10 31.20 161736 ARN74830726272312344870046 Apple Pay',
    'NR XXXX 4019 FORCHHEIM DE KAUFUMSATZ 12.10 67.89 161737 ARN74830726272312344870047 Apple Pay',
  ];
  const reweDates = ['29.09.2026', '01.10.2026', '05.10.2026', '12.10.2026'];
  const reweAmounts = ['-73,24', '-55,80', '-48,95', '-82,17'];
  for (let i = 0; i < 4; i++) {
    draw(page1, reweDates[i], 71, y);
    draw(page1, 'Kartenzahlung', 142, y);
    draw(page1, 'VISA REWE MULLER GMBH', 192, y);
    draw(page1, reweAmounts[i], amountX(reweAmounts[i]), y);
    y -= 12;
    draw(page1, rewePurposes[i], 142, y);
    y -= 12;
  }

  // 6. Lastschrift — PayPal / Netflix
  draw(page1, '15.10.2026', 71, y);
  draw(page1, 'Lastschrift', 142, y);
  draw(page1, 'PayPal Europe S.a.r.l. et Cie S.C.A', 192, y);
  draw(page1, '-24,99', amountX('-24,99'), y);
  y -= 12;
  draw(page1, 'Netflix.com, Ihr Einkauf bei Netflix.com', 142, y);
  y -= 12;

  // 7. Lastschrift — Stadtwerke (mit Mandat/Referenz)
  draw(page1, '18.10.2026', 71, y);
  draw(page1, 'Lastschrift', 142, y);
  draw(page1, 'Stadtwerke Nuernberg', 195, y);
  draw(page1, '-215,88', amountX('-215,88'), y);
  y -= 12;
  draw(page1, 'Abschlag Strom Vertragskonto 4711', 142, y);
  y -= 12;
  draw(page1, 'Mandat: ABC-123', 142, y);
  y -= 12;
  draw(page1, 'Referenz: XYZ-456', 142, y);
  y -= 12;

  // 8. Gutschrift — Gehalt (Arbeitgeber GmbH)
  draw(page1, '27.10.2026', 71, y);
  draw(page1, 'Gutschrift', 142, y);
  draw(page1, 'Muster Arbeitgeber GmbH', 192, y);
  draw(page1, '3.850,25', amountX('3.850,25'), y);
  y -= 12;
  draw(page1, 'GEHALT Oktober 2026', 142, y);
  y -= 12;

  // 9. Ueberweisung — Bargeldauszahlung
  draw(page1, '28.10.2026', 71, y);
  draw(page1, 'Ueberweisung', 142, y);
  draw(page1, 'Geldautomat Nuernberg', 192, y);
  draw(page1, '-150,00', amountX('-150,00'), y);
  y -= 12;
  draw(page1, 'Bargeldauszahlung', 142, y);
  y -= 12;

  // 10. Gutschrift mit abweichender Valuta
  draw(page1, '21.10.2026', 71, y);
  draw(page1, 'Gutschrift', 142, y);
  draw(page1, 'Rueckerstattung Shop GmbH', 192, y);
  draw(page1, '12,95', amountX('12,95'), y);
  y -= 12;
  draw(page1, '20.10.2026', 71, y); // abweichende Valuta
  draw(page1, 'Rueckerstattung Bestellung 123', 142, y);
  y -= 12;

  // 11. Lastschrift — BREZEN KOLB GMBH (VISA)
  draw(page1, '13.10.2026', 71, y);
  draw(page1, 'Kartenzahlung', 142, y);
  draw(page1, 'VISA BREZEN KOLB GMBH', 192, y);
  draw(page1, '-18,75', amountX('-18,75'), y);
  y -= 12;
  draw(page1, 'NURNBERG DE KAUFUMSATZ 13.10 12.50', 142, y);
  y -= 12;

  // 12. Lastschrift — POLLUX GRUNDSTUECKSGES (letzte Buchung vor Neuer Saldo)
  draw(page1, '30.10.2026', 71, y);
  draw(page1, 'Lastschrift', 142, y);
  draw(page1, 'VISA POLLUX GRUNDSTUECKSGES', 192, y);
  draw(page1, '-8,50', amountX('-8,50'), y);
  y -= 12;
  draw(page1, 'Miete Oktober', 142, y);

  // Fußzeilen
  draw(page1, '34GKKA1234567890_T', 28, 70);
  draw(page1, 'ING-DiBa AG · Theodor-Heuss-Allee 2 · 60486 Frankfurt am Main', 69, 41);

  // ---- Seite 2: Lange Empfängernamen ----
  const page2 = doc.addPage([595, 842]);
  y = 748;

  const draw2 = (text: string, x: number, yPos: number, size = 10) => {
    page2.drawText(text, { x, y: yPos, size, font, color: black });
  };

  // Kopfzeilen Seite 2
  draw2('ING-DiBa AG · 60628 Frankfurt am Main', 71, y);
  y -= 12;
  draw2('Girokonto Nummer 5435728801', 71, y);
  y -= 12;
  draw2('Kontoauszug Oktober 2026', 71, y);
  y -= 36;
  draw2('Datum', 425, y);
  draw2('31.10.2026', 500, y);
  y -= 12;
  draw2('Seite', 425, y);
  draw2('2 von 2', 519, y);
  y -= 24;

  // Spaltenkopf
  draw2('Buchung', 71, y);
  draw2('Buchung / Verwendungszweck', 142, y);
  draw2('Betrag (EUR)', 494, y);
  y -= 13;
  draw2('Valuta', 71, y);
  y -= 23;

  // 13. Lastschrift — Alte Leipziger Lebensversicherung (langer Name, SEPA-Blöcke)
  draw2('02.10.2026', 71, y);
  draw2('Lastschrift', 142, y);
  draw2('Alte Leipziger Lebensversicherung ', 192, y);
  draw2('-95,80', amountX('-95,80'), y);
  y -= 12;
  draw2('auf Gegenseitigkeit', 142, y); // Name-Fortsetzung in Valuta-Zeile
  y -= 12;
  draw2('Versicherungsbeitrag RV 2026', 142, y);
  y -= 12;

  // 14. Lastschrift — Zurich Deutscher Herold Lebensversicherung (langer Name)
  draw2('03.10.2026', 71, y);
  draw2('Lastschrift', 142, y);
  draw2('Zurich Deutscher Herold Lebensvers', 192, y);
  draw2('-178,25', amountX('-178,25'), y);
  y -= 12;
  draw2('icherung Aktiengesellschaft', 142, y); // Name-Fortsetzung
  y -= 12;
  draw2('Beitrag Lebensversicherung', 142, y);
  y -= 12;

  // 15. Lastschrift — Zurich Insurance Europe AG (langer Name)
  draw2('04.10.2026', 71, y);
  draw2('Lastschrift', 142, y);
  draw2('Zurich Insurance Europe AG Niederl', 192, y);
  draw2('-52,40', amountX('-52,40'), y);
  y -= 12;
  draw2('assung fur Deutschland', 142, y); // Name-Fortsetzung
  y -= 12;
  draw2('Haftpflichtbeitrag', 142, y);
  y -= 12;

  // 16. Lastschrift — Notare Klaus Weber und Sabine Fischer (langer Name)
  draw2('06.10.2026', 71, y);
  draw2('Lastschrift', 142, y);
  draw2('Notare Klaus Weber und Sabine Fisch', 192, y);
  draw2('-310,60', amountX('-310,60'), y);
  y -= 12;
  draw2('er', 142, y); // Name-Fortsetzung
  y -= 12;
  draw2('R1495/0/1-2026', 142, y);
  y -= 12;

  // Neuer Saldo auf Seite 2
  draw2('Neuer Saldo', 142, y);
  draw2('4.310,34', amountX('4.310,34'), y);
  y -= 24;

  // Kunden-Information (soll ignoriert werden)
  draw2('Kunden-Information', 71, y);
  y -= 12;
  draw2('Ihr ING-Berater: Julia Schmidt', 71, y);

  // Fußzeilen
  draw2('34GKKA1234567890_T', 28, 70);
  draw2('ING-DiBa AG · Theodor-Heuss-Allee 2 · 60486 Frankfurt am Main', 69, 41);

  return Buffer.from(await doc.save());
}
