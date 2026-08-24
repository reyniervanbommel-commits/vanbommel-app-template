import { describe, expect, it } from 'vitest';
import {
  clearUnseenChangeFlagsOnLine,
  clearUnseenChangeFlagsOnOrder,
  clearUnseenChangeFlagsOnOrders,
  withClearedUnseenBoardCounts,
} from './clearUnseenChangeFlags';

describe('clearUnseenChangeFlagsOnLine', () => {
  it('wist new/changed-flags maar laat isRemoved staan', () => {
    expect(clearUnseenChangeFlagsOnLine({
      lineNumber: 1,
      isNew: true,
      isChanged: true,
      isRemoved: true,
      changedFieldKeys: ['qty'],
      values: { qty: 2 },
    })).toEqual({
      lineNumber: 1,
      isNew: false,
      isChanged: false,
      isRemoved: true,
      changedFieldKeys: [],
      values: { qty: 2 },
    });
  });

  it('laat niet-objecten ongemoeid', () => {
    expect(clearUnseenChangeFlagsOnLine(null)).toBe(null);
  });
});

describe('clearUnseenChangeFlagsOnOrder', () => {
  it('wist activity-flags en laat removedInD365 staan', () => {
    const next = clearUnseenChangeFlagsOnOrder({
      orderNumber: 'PO-1',
      isNew: true,
      isChanged: true,
      hasNewLine: true,
      hasChangedLine: true,
      hasRemovedLine: true,
      hasRemovalChange: true,
      removedInD365: true,
      changedFieldKeys: ['status'],
      lines: [{ lineNumber: 1, isNew: true, isRemoved: false, changedFieldKeys: ['qty'] }],
    });
    expect(next).toMatchObject({
      orderNumber: 'PO-1',
      isNew: false,
      isChanged: false,
      hasNewLine: false,
      hasChangedLine: false,
      hasRemovedLine: false,
      hasRemovalChange: false,
      removedInD365: true,
      changedFieldKeys: [],
    });
    expect(next.lines[0]).toMatchObject({
      isNew: false,
      isRemoved: false,
      changedFieldKeys: [],
    });
  });
});

describe('clearUnseenChangeFlagsOnOrders', () => {
  it('mapt een lijst en valt terug op []', () => {
    expect(clearUnseenChangeFlagsOnOrders(null)).toEqual([]);
    expect(clearUnseenChangeFlagsOnOrders([{ isNew: true }])[0].isNew).toBe(false);
  });
});

describe('withClearedUnseenBoardCounts', () => {
  it('zet tellers op 0 en bewaart de rest van de payload', () => {
    const orders = [{ orderNumber: 'PO-1' }];
    expect(withClearedUnseenBoardCounts({ syncedAt: 'x', newCount: 4 }, orders)).toEqual({
      syncedAt: 'x',
      orders,
      newCount: 0,
      changedCount: 0,
    });
  });
});
