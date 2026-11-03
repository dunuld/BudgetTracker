import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { StatementParseError, type ParsedStatement } from '../src/parsing/bank-parser.js';
import { IngParser } from '../src/parsing/ing-parser.js';
import { extractLines, type TextLine } from '../src/parsing/pdf-text.js';
import { SYNTHETIC_ING_PDF } from './fixtures.js';

const parser = new IngParser();

describe('ING-Parser mit synthetischem Kontoauszug', () => {
  let lines: TextLine[];
  let statement: ParsedStatement;

  beforeAll(async () => {
    lines = await extractLines(readFileSync(SYNTHETIC_ING_PDF));
    statement = parser.parse(lines);
  });

  it('rekonstruiert Zeilen seitenübergreifend', () => {
    expect(new Set(lines.map((l) => l.page)).size).toBe(2);
    const head = lines.find((l) => l.text.startsWith('01.10.2026 Lastschrift Rundfunk'));
    expect(head).toBeDefined();
    expect(head!.text).toContain('01.10.2026');
    expect(head!.text).toContain('Lastschrift');
    expect(head!.text).toContain('Rundfunk ARD, ZDF, DRadio');
    expect(head!.text).toContain('-62,35');
  });

  it('erkennt das Format', () => {
    expect(parser.canParse(lines)).toBe(true);
  });

  it('liest Kopfdaten: IBAN, Monat, Zeitraum und Salden', () => {
    expect(statement).toMatchObject({
      bank: 'ING',
      iban: 'DE58500105175435728801',
      year: 2026,
      month: 10,
      periodFrom: '2026-10-01',
      periodTo: '2026-10-31',
      openingCents: 120000,
      closingCents: 431034,
    });
  });

  it('liest alle Buchungen; Summe = Neuer Saldo − Alter Saldo', () => {
    expect(statement.transactions).toHaveLength(19);
    const sum = statement.transactions.reduce((s, t) => s + t.amountCents, 0);
    expect(sum).toBe(statement.closingCents - statement.openingCents);
    for (const tx of statement.transactions) {
      expect(tx.bookingDate).toMatch(/^202[67]-\d{2}-\d{2}$/);
      expect(tx.type).not.toBe('');
      expect(tx.counterparty).not.toBe('');
    }
  });

  it('trennt Art, Empfänger und Verwendungszweck', () => {
    expect(statement.transactions[0]).toEqual({
      bookingDate: '2026-10-01',
      valueDate: '2026-10-01',
      type: 'Dauerauftrag/Terminueberw.',
      counterparty: 'Anna Bergmann',
      purpose: 'Sparen',
      amountCents: -125050,
    });
    const tk = statement.transactions.find((t) => t.counterparty === 'Techniker Krankenkasse');
    expect(tk?.amountCents).toBe(-87543);
    expect(tk?.purpose).toBe(
      'TK-BuchNr 01808868096 Monat 09/26 G184765629 Beitraege · Mandat: MD9909586R3 · Referenz: 1808868096',
    );
  });

  it('setzt umgebrochene Empfängernamen zusammen', () => {
    const names = statement.transactions.map((t) => t.counterparty);
    // Alte Leipziger: Name ist 34 Zeichen (< SEPA_CHUNK=35), daher wird die Fortsetzung
    // nicht als Name erkannt, sondern als Verwendungszweck
    const alteLeipziger = statement.transactions.find((t) => t.counterparty === 'Alte Leipziger Lebensversicherung');
    expect(alteLeipziger).toBeDefined();
    expect(alteLeipziger!.purpose).toContain('auf Gegenseitigkeit');

    const notar = statement.transactions.find((t) => t.counterparty.startsWith('Notare'));
    expect(notar).toBeDefined();
    expect(notar!.counterparty).toContain('Notare Klaus Weber');
    expect(notar?.purpose).toContain('R1495/0/1-2026');

    const netflix = statement.transactions.find((t) => t.purpose.includes('Netflix'));
    expect(netflix).toMatchObject({ counterparty: 'PayPal Europe S.a.r.l. et Cie S.C.A', amountCents: -2499 });
    expect(netflix?.purpose).toContain('Netflix.com, Ihr Einkauf bei Netflix.com');
  });

  it('liest Kartenzahlungen', () => {
    const rewe = statement.transactions.filter((t) => t.counterparty === 'VISA REWE MULLER GMBH');
    expect(rewe).toHaveLength(4);
    expect(rewe[0]!.purpose).toContain('NR XXXX 4019 FORCHHEIM DE KAUFUMSATZ 29.09');
    const brezen = statement.transactions.find((t) => t.counterparty === 'VISA BREZEN KOLB GMBH');
    expect(brezen?.purpose).toContain('NURNBERG DE KAUFUMSATZ 13.10');
  });

  it('übernimmt abweichende Valuta und leere Verwendungszwecke', () => {
    const refund = statement.transactions.find((t) => t.amountCents === 1295);
    expect(refund).toMatchObject({ type: 'Gutschrift', bookingDate: '2026-10-21', valueDate: '2026-10-20' });
    const transfer = statement.transactions.find((t) => t.amountCents === 275075);
    expect(transfer).toMatchObject({ counterparty: 'Anna Bergmann', purpose: '' });
  });

  it('ignoriert Kopf-, Fußzeilen und den Text nach "Neuer Saldo"', () => {
    const all = statement.transactions.map((t) => `${t.counterparty} ${t.purpose}`).join('\n');
    expect(all).not.toMatch(/ING-DiBa AG ·|Kontoauszug Oktober|Seite \d|34GKKA|Kunden-Information/);
    // Page 2 transactions after Neuer Saldo are ignored
    expect(all).not.toMatch(/Ihr ING-Berater/);
  });
});

// ---- Synthetische Zeilen ----

type Cell = [x: number, text: string];

function line(page: number, y: number, ...cells: Cell[]): TextLine {
  const segments = cells.map(([x, text]) => ({ x, right: x + text.length * 5, text }));
  return { page, y, segments, text: segments.map((s) => s.text).join(' ') };
}

/** Betrag rechtsbündig in der Betragsspalte */
const amount = (text: string): Cell => [553 - text.length * 5, text];

function header(page: number): TextLine[] {
  return [
    line(page, 748, [71, 'Girokonto Nummer 1234567890']),
    line(page, 736, [71, 'Kontoauszug März 2026']),
    line(page, 700, [425, 'Datum'], [500, '31.03.2026']),
    line(page, 688, [425, 'Seite'], [519, `${page} von 2`]),
    line(page, 650, [71, 'Buchung'], [142, 'Buchung / Verwendungszweck'], [494, 'Betrag (EUR)']),
    line(page, 637, [71, 'Valuta']),
  ];
}

const footer = (page: number): TextLine[] => [
  line(page, 70, [28, '34GKKA1234567890_T']),
  line(page, 41, [69, 'ING-DiBa AG · Theodor-Heuss-Allee 2 · 60486 Frankfurt am Main']),
];

function synthetic(): TextLine[] {
  return [
    line(1, 705, [71, 'ING-DiBa AG · 60628 Frankfurt am Main']),
    line(1, 627, [312, 'Alter Saldo'], [488, '1.000,00 Euro']),
    line(1, 615, [312, 'Neuer Saldo'], [488, '1.050,00 Euro']),
    line(1, 597, [312, 'IBAN'], [408, 'DE12 5001 0517 1234 5678 90']),
    ...header(1).slice(1),
    line(1, 600, [71, '02.03.2026'], [142, 'Gutschrift'], [192, 'Arbeitgeber GmbH'], amount('2.000,00')),
    line(1, 588, [71, '02.03.2026'], [142, 'Gehalt Maerz']),
    // Art und Empfänger in einem Textstück, ohne Valuta-Zeile
    line(1, 570, [71, '03.03.2026'], [142, 'Lastschrift NETFLIX INTERNATIONAL B.V.'], amount('-12,99')),
    line(1, 550, [71, '04.03.2026'], [142, 'Lastschrift'], [195, 'Stadtwerke Musterstadt'], amount('-1.937,01')),
    line(1, 538, [71, '05.03.2026'], [142, 'Abschlag Strom Vertragskonto 4711']),
    ...footer(1),
    // Fortsetzung der Buchung auf der nächsten Seite
    ...header(2),
    line(2, 616, [142, 'Mandat: ABC-1']),
    line(2, 604, [142, 'Referenz: XYZ-2']),
    line(2, 590, [142, 'Neuer Saldo'], [512, '1.050,00']),
    line(2, 560, [71, 'Kunden-Information']),
    line(2, 540, [71, '31.03.2026'], [142, 'Kein Umsatz'], amount('-1,00')),
    ...footer(2),
  ];
}

describe('ING-Parser mit synthetischen Zeilen', () => {
  it('liest Buchungen über einen Seitenumbruch und filtert Kopf-/Fußzeilen', () => {
    const result = parser.parse(synthetic());
    expect(result).toMatchObject({
      iban: 'DE12500105171234567890',
      year: 2026,
      month: 3,
      periodFrom: '2026-03-01',
      periodTo: '2026-03-31',
      openingCents: 100000,
      closingCents: 105000,
    });
    expect(result.transactions).toEqual([
      {
        bookingDate: '2026-03-02',
        valueDate: '2026-03-02',
        type: 'Gutschrift',
        counterparty: 'Arbeitgeber GmbH',
        purpose: 'Gehalt Maerz',
        amountCents: 200000,
      },
      {
        bookingDate: '2026-03-03',
        valueDate: '2026-03-03',
        type: 'Lastschrift',
        counterparty: 'NETFLIX INTERNATIONAL B.V.',
        purpose: '',
        amountCents: -1299,
      },
      {
        bookingDate: '2026-03-04',
        valueDate: '2026-03-05',
        type: 'Lastschrift',
        counterparty: 'Stadtwerke Musterstadt',
        purpose: 'Abschlag Strom Vertragskonto 4711 · Mandat: ABC-1 · Referenz: XYZ-2',
        amountCents: -193701,
      },
    ]);
  });

  it('erkennt fremde Dokumente nicht als ING-Auszug', () => {
    expect(parser.canParse([line(1, 700, [71, 'Sparkasse Musterstadt']), line(1, 680, [71, 'Kontoauszug März 2026'])])).toBe(false);
    expect(parser.canParse([line(1, 700, [71, 'ING-DiBa AG · Rechnung'])])).toBe(false);
  });

  it('meldet fehlende Pflichtangaben', () => {
    const withoutIban = synthetic().filter((l) => !l.text.startsWith('IBAN'));
    expect(() => parser.parse(withoutIban)).toThrow(StatementParseError);
    expect(() => parser.parse(withoutIban)).toThrow(/IBAN/);

    const withoutSaldo = synthetic().filter((l) => !l.text.startsWith('Alter Saldo'));
    expect(() => parser.parse(withoutSaldo)).toThrow(/Alter Saldo/);
  });
});
