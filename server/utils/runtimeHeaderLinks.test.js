'use strict';

const {
  parseRuntimeHeaderLinks,
  mergeRuntimeHeaderLinks,
  loadRuntimeHeaderLinks,
  clearRuntimeHeaderLinksCache,
} = require('./runtimeHeaderLinks');

beforeEach(() => {
  clearRuntimeHeaderLinksCache();
});

describe('parseRuntimeHeaderLinks', () => {
  it('leest total- en value-links uit settings JSON', () => {
    const parsed = parseRuntimeHeaderLinks(JSON.stringify({
      lineTotalHeaderLinks: [{ lineColumnKey: 'quantity', headerColumnKey: 'qty_total' }],
      lineValueHeaderLinks: [{ lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' }],
    }));
    expect(parsed.lineTotalHeaderLinks).toEqual([
      { lineColumnKey: 'quantity', headerColumnKey: 'qty_total' },
    ]);
    expect(parsed.lineValueHeaderLinks).toEqual([
      { lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' },
    ]);
  });

  it('geeft lege lijsten bij ongeldige JSON', () => {
    expect(parseRuntimeHeaderLinks('{niet-json')).toEqual({
      lineTotalHeaderLinks: [],
      lineValueHeaderLinks: [],
    });
  });
});

describe('mergeRuntimeHeaderLinks', () => {
  it('verenigt staff-links met eigen links; eigen header wint bij conflict', () => {
    const staff = {
      lineTotalHeaderLinks: [
        { lineColumnKey: 'quantity', headerColumnKey: 'qty_total' },
        { lineColumnKey: 'amount', headerColumnKey: 'amount_total' },
      ],
      lineValueHeaderLinks: [{ lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' }],
    };
    const own = {
      lineTotalHeaderLinks: [{ lineColumnKey: 'confirmedQty', headerColumnKey: 'qty_total' }],
      lineValueHeaderLinks: [],
    };
    expect(mergeRuntimeHeaderLinks(staff, own)).toEqual({
      lineTotalHeaderLinks: [
        { lineColumnKey: 'confirmedQty', headerColumnKey: 'qty_total' },
        { lineColumnKey: 'amount', headerColumnKey: 'amount_total' },
      ],
      lineValueHeaderLinks: [{ lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' }],
    });
  });
});

function mockPool({ ownJson = null, staffJsons = [] } = {}) {
  return {
    request() {
      return {
        input() { return this; },
        async query(text) {
          if (String(text).includes('dbo.users')) {
            return { recordset: staffJsons.map((settings_json) => ({ settings_json })) };
          }
          return { recordset: ownJson == null ? [] : [{ settings_json: ownJson }] };
        },
      };
    },
  };
}

describe('loadRuntimeHeaderLinks', () => {
  it('laadt alleen eigen links zonder includeStaffLinks', async () => {
    const pool = mockPool({
      ownJson: JSON.stringify({
        lineTotalHeaderLinks: [{ lineColumnKey: 'quantity', headerColumnKey: 'own_total' }],
      }),
      staffJsons: [JSON.stringify({
        lineTotalHeaderLinks: [{ lineColumnKey: 'quantity', headerColumnKey: 'staff_total' }],
      })],
    });
    const links = await loadRuntimeHeaderLinks(pool, 9, 'purchase-orders');
    expect(links.lineTotalHeaderLinks).toEqual([
      { lineColumnKey: 'quantity', headerColumnKey: 'own_total' },
    ]);
  });

  it('voegt staff-links toe voor een vendor-read, ook als de vendor zelf geen links heeft', async () => {
    const pool = mockPool({
      ownJson: JSON.stringify({ visibleColumns: ['status'] }),
      staffJsons: [JSON.stringify({
        lineTotalHeaderLinks: [{ lineColumnKey: 'quantity', headerColumnKey: 'qty_total' }],
        lineValueHeaderLinks: [{ lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' }],
      })],
    });
    const links = await loadRuntimeHeaderLinks(pool, 9, 'purchase-orders', { includeStaffLinks: true });
    expect(links.lineTotalHeaderLinks).toEqual([
      { lineColumnKey: 'quantity', headerColumnKey: 'qty_total' },
    ]);
    expect(links.lineValueHeaderLinks).toEqual([
      { lineColumnKey: 'itemNumber', headerColumnKey: 'items_on_header' },
    ]);
  });
});
