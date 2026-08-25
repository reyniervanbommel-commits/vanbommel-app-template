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
      values: { vendorAccount: 'V001', status: 'Open', ...(overrides.values || {}) },
      details: overrides.details || [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: received,
          openQty: 10,
          deliveredQty: 4,
          ...(overrides.line || {}),
        },
      }],
    };
  }

  it('places received above on the planned week and below on the receipt week', () => {
    const byWeek = buildPoSegments([row()], baseConfig, window, { now: nowCurrent });
    const above = byWeek.get(plannedWeek.key).segmentsAbove;
    const below = byWeek.get(receivedWeek.key).segmentsBelow;
    expect(above).toEqual([
      { poNumber: 'PO-A', qty: 4, status: 'received', late: false },
      { poNumber: 'PO-A', qty: 10, status: 'open', late: false },
    ]);
    expect(below).toEqual([
      { poNumber: 'PO-A', qty: 4, status: 'received', late: false },
    ]);
    expect(byWeek.get(plannedWeek.key).segmentsBelow).toEqual([]);
  });

  it('falls back to the planned week below the axis when receipt date is empty', () => {
    const config = { ...baseConfig, receiptDateColumnKey: '' };
    const byWeek = buildPoSegments([row({ line: { productReceiptDate: '' } })], config, window, {
      now: nowCurrent,
    });
    expect(byWeek.get(plannedWeek.key).segmentsBelow).toEqual([
      { poNumber: 'PO-A', qty: 4, status: 'received', late: false },
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
      { poNumber: 'PO-A', qty: 4, status: 'received', late: false },
    ]);
    expect(byWeek.get(receivedWeek.key).segmentsAbove).toEqual([]);
    expect(byWeek.has(plannedWeek.key)).toBe(false);
  });

  it('filters other vendors when vendorAccount is set', () => {
    const other = row({ values: { vendorAccount: 'V999' } });
    other.recordKey = 'PO-X';
    const byWeek = buildPoSegments([row(), other], baseConfig, window, {
      now: nowCurrent,
      vendorAccount: 'V001',
    });
    const pos = byWeek.get(plannedWeek.key).segmentsAbove.map((s) => s.poNumber);
    expect(pos).not.toContain('PO-X');
    expect(pos).toContain('PO-A');
  });

  it('sorts PO numbers and stacks received against the axis then open', () => {
    const b = row();
    b.recordKey = 'PO-B';
    const a = row();
    a.recordKey = 'PO-A';
    const byWeek = buildPoSegments([b, a], baseConfig, window, { now: nowCurrent });
    expect(byWeek.get(plannedWeek.key).segmentsAbove.map((s) => `${s.poNumber}:${s.status}`)).toEqual([
      'PO-A:received',
      'PO-A:open',
      'PO-B:received',
      'PO-B:open',
    ]);
  });

  it('skips zero and negative quantities', () => {
    const byWeek = buildPoSegments([row({ line: { openQty: 0, deliveredQty: -3 } })], baseConfig, window, {
      now: nowCurrent,
    });
    expect(byWeek.get(plannedWeek.key).segmentsAbove).toEqual([]);
    expect(byWeek.get(receivedWeek.key).segmentsBelow).toEqual([]);
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
});
