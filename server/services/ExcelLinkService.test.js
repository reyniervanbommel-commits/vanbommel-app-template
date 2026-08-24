'use strict';

// Unit-tests voor de pure parse/typedetectie-laag van de Excel-koppeling (#AB:162). DB-onafhankelijk:
// we genereren een werkboek-buffer met xlsx en controleren kolomdetectie, typedetectie en rij-normalisatie.

const XLSX = require('xlsx');
const { parseWorkbook, createTbCacheBulkTable } = require('./ExcelLinkService');

function toBuffer(aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Blad1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('ExcelLinkService.parseWorkbook', () => {
  it('detecteert kolommen, types en samples', () => {
    const buf = toBuffer([
      ['Artikelnr', 'Aantal', 'Prijs'],
      ['ART-1', 10, 4.5],
      ['ART-2', 20, 9.99],
      ['ART-3', 5, 1.0],
    ]);
    const { columns, rows } = parseWorkbook(buf);
    expect(columns.map((c) => c.label)).toEqual(['Artikelnr', 'Aantal', 'Prijs']);
    const byLabel = Object.fromEntries(columns.map((c) => [c.label, c]));
    expect(byLabel.Artikelnr.dataType).toBe('text');
    expect(byLabel.Aantal.dataType).toBe('number');
    expect(byLabel.Prijs.dataType).toBe('number');
    expect(rows).toHaveLength(3);
    // data_json gebruikt de afgeleide kolom-key.
    expect(rows[0][byLabel.Artikelnr.key]).toBe('ART-1');
    expect(rows[0][byLabel.Aantal.key]).toBe(10);
  });

  it('leidt stabiele, unieke kolom-keys af en voorkomt botsingen', () => {
    const buf = toBuffer([
      ['Naam', 'Naam', '123'],
      ['a', 'b', 'c'],
    ]);
    const { columns } = parseWorkbook(buf);
    const keys = columns.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length); // allemaal uniek
    expect(keys.every((k) => k.length > 0 && k.length <= 64 && /^[A-Za-z]/.test(k))).toBe(true);
  });

  it('filtert volledig lege rijen weg', () => {
    const buf = toBuffer([
      ['A', 'B'],
      ['x', 'y'],
      [null, null],
      ['', ''],
      ['z', null],
    ]);
    const { rows } = parseWorkbook(buf);
    expect(rows).toHaveLength(2);
  });

  it('detecteert een datumkolom als date', () => {
    const buf = toBuffer([
      ['Datum'],
      [new Date('2026-01-01T00:00:00Z')],
      [new Date('2026-02-15T00:00:00Z')],
    ]);
    const { columns, rows } = parseWorkbook(buf);
    expect(columns[0].dataType).toBe('date');
    expect(typeof rows[0][columns[0].key]).toBe('string'); // ISO-genormaliseerd
  });

  it('werpt een 400 bij een leeg werkblad', () => {
    const buf = toBuffer([]);
    expect(() => parseWorkbook(buf)).toThrow();
  });

  it('behandelt een gemengde kolom (getal + tekst) als text', () => {
    const buf = toBuffer([
      ['Code'],
      [123],
      ['ABC'],
    ]);
    const { columns } = parseWorkbook(buf);
    expect(columns[0].dataType).toBe('text');
  });

  it('behandelt identifiers met leidende nul als text (behoudt de sleutelwaarde)', () => {
    // Artikelnummers als "00123" mogen niet naar 123 gecoerct worden (sleutel-match #AB:162).
    const buf = toBuffer([
      ['Artikelnr'],
      ['00123'],
      ['00456'],
    ]);
    const { columns, rows } = parseWorkbook(buf);
    expect(columns[0].dataType).toBe('text');
    expect(rows[0][columns[0].key]).toBe('00123');
  });
});

describe('ExcelLinkService.createTbCacheBulkTable', () => {
  it('verklaart data_json nullable, gelijk aan dbo.tb_cache (anders faalt BCP met 4816)', () => {
    const table = createTbCacheBulkTable();
    const dataJson = table.columns.find((col) => col.name === 'data_json');
    expect(dataJson).toBeTruthy();
    expect(dataJson.nullable).toBe(true);
  });
});
