'use strict';

const { getIsoWeek, getIsoWeekYear, isoWeekKey } = require('./isoWeek');
const { buildPoSegments, mergeSegmentsIntoChart } = require('./rccpPoSegments');

function weekOf(date) {
  return { year: getIsoWeekYear(date), week: getIsoWeek(date), key: isoWeekKey(getIsoWeekYear(date), getIsoWeek(date)) };
}

describe('buildPoSegments', () => {
  const planned = '2026-03-16T00:00:00.000Z'; // ISO week of this date
  const received = '2026-03-30T00:00:00.000Z';
  const plannedWeek = weekOf(planned);
  const receivedWeek = weekOf(received);
  const nowCurrent = new Date(planned);
  const nowNext = new Date('2026-03-23T00:00:00.000Z');

  const baseConfig = {
    dateColumnKey: 'requestedDeliveryDate',
    receiptDateColumnKey: 'productReceiptDate',
    vendorColumnKey: 'vendorAccount',
    openMeasureKey: 'openQty',
    deliveredMeasureKey: 'deliveredQty',
    excludedStatuses: ['Canceled'],
  };

  const window = {
    fromYear: plannedWeek.year,
    fromWeek: Math.min(plannedWeek.week, receivedWeek.week),
    toYear: receivedWeek.year,
    toWeek: Math.max(plannedWeek.week, receivedWeek.week),
  };

  function row(overrides = {}) {
    return {
      recordKey: 'PO-A',
      partitionKey: 'whsl',
      values: { vendorAccount: 'V001', status: 'Open', dataAreaId: 'whsl', ...(overrides.values || {}) },
      details: overrides.details || [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: received,
          openQty: 10,
          deliveredQty: 4,
          itemNumber: 'SKU-1',
          ...(overrides.line || {}),
        },
      }],
    };
  }

  function seg(itemNumber, qty, status, late) {
    return {
      itemNumber, qty, status, late, dataAreaId: 'whsl',
    };
  }

  it('places received above on the planned week and below on the receipt week', () => {
    const byWeek = buildPoSegments([row()], baseConfig, window, { now: nowCurrent });
    const above = byWeek.get(plannedWeek.key).segmentsAbove;
    const below = byWeek.get(receivedWeek.key).segmentsBelow;
    expect(above).toEqual([
      seg('SKU-1', 4, 'received', false),
      seg('SKU-1', 10, 'open', false),
    ]);
    expect(below).toEqual([
      seg('SKU-1', 4, 'received', false),
    ]);
    expect(byWeek.get(plannedWeek.key).segmentsBelow).toEqual([]);
  });

  it('falls back to the planned week below the axis when receipt date is empty', () => {
    const config = { ...baseConfig, receiptDateColumnKey: '' };
    const byWeek = buildPoSegments([row({ line: { productReceiptDate: '' } })], config, window, {
      now: nowCurrent,
    });
    expect(byWeek.get(plannedWeek.key).segmentsBelow).toEqual([
      seg('SKU-1', 4, 'received', false),
    ]);
    expect(byWeek.get(receivedWeek.key).segmentsBelow).toEqual([]);
  });

  it('marks open as late when the planned week is strictly before now', () => {
    const byWeek = buildPoSegments([row()], baseConfig, window, { now: nowNext });
    const open = byWeek.get(plannedWeek.key).segmentsAbove.find((s) => s.status === 'open');
    expect(open.late).toBe(true);
    const receivedSeg = byWeek.get(plannedWeek.key).segmentsAbove.find((s) => s.status === 'received');
    expect(receivedSeg.late).toBe(false);
  });

  it('does not mark open in the current ISO week as late', () => {
    const byWeek = buildPoSegments([row()], baseConfig, window, { now: nowCurrent });
    const open = byWeek.get(plannedWeek.key).segmentsAbove.find((s) => s.status === 'open');
    expect(open.late).toBe(false);
  });

  it('keeps received-below when planned week is outside the window', () => {
    const clipWindow = {
      fromYear: receivedWeek.year,
      fromWeek: receivedWeek.week,
      toYear: receivedWeek.year,
      toWeek: receivedWeek.week,
    };
    const byWeek = buildPoSegments([row()], baseConfig, clipWindow, { now: nowCurrent });
    expect(byWeek.get(receivedWeek.key).segmentsBelow).toEqual([
      seg('SKU-1', 4, 'received', false),
    ]);
    expect(byWeek.get(receivedWeek.key).segmentsAbove).toEqual([]);
    expect(byWeek.has(plannedWeek.key)).toBe(false);
  });

  it('filters other vendors when vendorAccount is set', () => {
    const other = row({ values: { vendorAccount: 'V999' }, line: { itemNumber: 'SKU-X' } });
    other.recordKey = 'PO-X';
    const byWeek = buildPoSegments([row(), other], baseConfig, window, {
      now: nowCurrent,
      vendorAccount: 'V001',
    });
    const items = byWeek.get(plannedWeek.key).segmentsAbove.map((s) => s.itemNumber);
    expect(items).not.toContain('SKU-X');
    expect(items).toContain('SKU-1');
  });

  it('sorts unique items and stacks received against the axis then open', () => {
    const b = row({ line: { itemNumber: 'SKU-B' } });
    b.recordKey = 'PO-B';
    const a = row({ line: { itemNumber: 'SKU-A' } });
    a.recordKey = 'PO-A';
    const byWeek = buildPoSegments([b, a], baseConfig, window, { now: nowCurrent });
    expect(byWeek.get(plannedWeek.key).segmentsAbove.map((s) => `${s.itemNumber}:${s.status}`)).toEqual([
      'SKU-A:received',
      'SKU-A:open',
      'SKU-B:received',
      'SKU-B:open',
    ]);
  });

  it('merges the same item from different POs into one segment', () => {
    const second = row();
    second.recordKey = 'PO-B';
    const byWeek = buildPoSegments([row(), second], baseConfig, window, { now: nowCurrent });
    expect(byWeek.get(plannedWeek.key).segmentsAbove).toEqual([
      seg('SKU-1', 8, 'received', false),
      seg('SKU-1', 20, 'open', false),
    ]);
  });

  it('skips zero and negative quantities', () => {
    const byWeek = buildPoSegments([row({ line: { openQty: 0, deliveredQty: -3 } })], baseConfig, window, {
      now: nowCurrent,
    });
    expect(byWeek.get(plannedWeek.key).segmentsAbove).toEqual([]);
    expect(byWeek.get(receivedWeek.key).segmentsBelow).toEqual([]);
  });

  it('uses the order partitionKey even when the line has another dataAreaId', () => {
    const byWeek = buildPoSegments(
      [row({ line: { dataAreaId: 'not-a-company-code' } })],
      baseConfig,
      window,
      { now: nowCurrent },
    );
    expect(byWeek.get(plannedWeek.key).segmentsAbove[0].dataAreaId).toBe('whsl');
  });

  it('falls back to values.dataAreaId when partitionKey is empty', () => {
    const orphan = row();
    orphan.partitionKey = '';
    orphan.values.dataAreaId = 'nl01';
    const byWeek = buildPoSegments([orphan], baseConfig, window, { now: nowCurrent });
    expect(byWeek.get(plannedWeek.key).segmentsAbove[0].dataAreaId).toBe('nl01');
  });

  it('merges segments onto existing chart points', () => {
    const byWeek = buildPoSegments([row()], baseConfig, window, { now: nowCurrent });
    const chart = mergeSegmentsIntoChart(
      [{ key: plannedWeek.key, year: plannedWeek.year, week: plannedWeek.week }],
      byWeek,
    );
    expect(chart[0].segmentsAbove).toHaveLength(2);
    expect(chart[0].segmentsBelow).toEqual([]);
  });

  it('places open qty on the confirmed week as segmentsConfirmed', () => {
    const confirmed = '2026-03-23T00:00:00.000Z';
    const confirmedWeek = weekOf(confirmed);
    const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
    const byWeek = buildPoSegments([row({ line: { confirmedDlvDate: confirmed } })], config, {
      ...window, toWeek: Math.max(window.toWeek, confirmedWeek.week),
    }, { now: nowCurrent });
    expect(byWeek.get(confirmedWeek.key).segmentsConfirmed).toEqual([
      { itemNumber: 'SKU-1', qty: 10, status: 'confirmed', late: false, dataAreaId: 'whsl' },
    ]);
    expect(byWeek.get(plannedWeek.key).segmentsConfirmed || []).toEqual([]);
  });

  it('skips sentinel and empty confirmed dates', () => {
    const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
    const byWeek = buildPoSegments([
      row({ line: { confirmedDlvDate: '1900-01-01T00:00:00.000Z' } }),
    ], config, window, { now: nowCurrent });
    for (const bucket of byWeek.values()) {
      expect(bucket.segmentsConfirmed || []).toEqual([]);
    }
  });

  it('clips confirmed segments outside the window', () => {
    const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
    const byWeek = buildPoSegments([
      row({ line: { confirmedDlvDate: '2020-01-06T00:00:00.000Z' } }),
    ], config, window, { now: nowCurrent });
    for (const bucket of byWeek.values()) {
      expect(bucket.segmentsConfirmed || []).toEqual([]);
    }
  });
});
