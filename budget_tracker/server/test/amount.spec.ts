import { describe, expect, it } from 'vitest';
import {
  lastDayOfMonth,
  parseAmountCents,
  parseGermanDate,
  parseGermanMonth,
  removeChunkSpaces,
} from '../src/parsing/amount.js';

describe('parseAmountCents', () => {
  it.each([
    ['0,00', 0],
    ['-6,80', -680],
    ['31,34', 3134],
    ['-1.249,12', -124912],
    ['3.000,00', 300000],
    ['1.234.567,89', 123456789],
    ['+12,00', 1200],
    ['5.086,50 Euro', 508650],
    ['-0,99 €', -99],
    ['12,50 EUR', 1250],
  ])('%s → %i', (text, cents) => {
    expect(parseAmountCents(text)).toBe(cents);
  });

  it.each(['', '12', '12,5', '1,234.56', '12.34', '1.23,45', 'abc', '01.10.2026', '-'])(
    'lehnt %j ab',
    (text) => {
      expect(parseAmountCents(text)).toBeNull();
    },
  );
});

describe('parseGermanDate', () => {
  it('wandelt in ISO um', () => {
    expect(parseGermanDate('01.10.2026')).toBe('2026-10-01');
    expect(parseGermanDate(' 29.02.2028 ')).toBe('2028-02-29');
  });

  it.each(['31.04.2026', '29.02.2027', '00.01.2026', '01.13.2026', '1.10.2026', '01.10.26', 'x'])(
    'lehnt %j ab',
    (text) => {
      expect(parseGermanDate(text)).toBeNull();
    },
  );
});

describe('Monate', () => {
  it('erkennt deutsche Monatsnamen', () => {
    expect(parseGermanMonth('Oktober')).toBe(10);
    expect(parseGermanMonth('januar')).toBe(1);
    expect(parseGermanMonth('März')).toBe(3);
    expect(parseGermanMonth('Maerz')).toBe(3);
    expect(parseGermanMonth('October')).toBeNull();
  });

  it('liefert den Monatsletzten', () => {
    expect(lastDayOfMonth(2026, 10)).toBe('2026-10-31');
    expect(lastDayOfMonth(2028, 2)).toBe('2028-02-29');
    expect(lastDayOfMonth(2026, 2)).toBe('2026-02-28');
  });
});

describe('removeChunkSpaces', () => {
  it.each([
    // eingefügter Trenner mitten im Wort
    ['Alte Leipziger Lebensversicherung a uf Gegenseitigkeit', 'Alte Leipziger Lebensversicherung auf Gegenseitigkeit'],
    ['ZURICH LIFE ASSURANCE PUBLIC LIMITE D COMPANY', 'ZURICH LIFE ASSURANCE PUBLIC LIMITED COMPANY'],
    // mehrere Blöcke, Prüfung an der nächsten Blockgrenze
    [
      'Rundfunk 10.2026 - 12.2026 Beitrags nr. 238906216 Aenderungen ganz bequ em: www.rundfunkbeitrag.de',
      'Rundfunk 10.2026 - 12.2026 Beitragsnr. 238906216 Aenderungen ganz bequem: www.rundfunkbeitrag.de',
    ],
    // echtes Leerzeichen am Blockende verschmilzt mit dem Trenner
    [
      'Glaeub-ID DE79ZZZ00000472780 Mandat 10541 Rechnung 1641 vom 22.10.26 D ebitor 10541',
      'Glaeub-ID DE79ZZZ00000472780 Mandat 10541 Rechnung 1641 vom 22.10.26 Debitor 10541',
    ],
    // letzter Block nicht prüfbar: Klein-/Großbuchstabe → Leerzeichen bleibt
    ['Notar Rechnung Grundschuld ING-DiBa AG', 'Notar Rechnung Grundschuld ING-DiBa AG'],
    [
      '1053907427999/PP.4778.PP/. Takeaway .com Payments B.V., Ihr Einkauf bei Takeaway.com Payments B.V.',
      '1053907427999/PP.4778.PP/. Takeaway.com Payments B.V., Ihr Einkauf bei Takeaway.com Payments B.V.',
    ],
    // kurze Texte bleiben unverändert
    ['Sparen', 'Sparen'],
    ['', ''],
  ])('%j', (input, expected) => {
    expect(removeChunkSpaces(input)).toBe(expected);
  });
});
