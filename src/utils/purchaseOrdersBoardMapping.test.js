import { describe, expect, it } from 'vitest';
import {
  mapTbColumnToBoard,
  mapTbResponseToBoard,
  resolveBoardWriteBackAllowed,
  scopeForLevel,
} from './purchaseOrdersBoardMapping';

describe('scopeForLevel', () => {
  it('maps line to detail and everything else to master', () => {
    expect(scopeForLevel('line')).toBe('detail');
    expect(scopeForLevel('header')).toBe('master');
    expect(scopeForLevel(undefined)).toBe('master');
  });
});

describe('resolveBoardWriteBackAllowed', () => {
  it('respects an explicit boolean', () => {
    expect(resolveBoardWriteBackAllowed({ writeBackAllowed: true, source: 'manual' })).toBe(true);
    expect(resolveBoardWriteBackAllowed({ writeBackAllowed: false, source: 'd365', d365Field: 'X' })).toBe(false);
  });

  it('requires a d365 source with a mapped field', () => {
    expect(resolveBoardWriteBackAllowed({ source: 'manual', d365Field: 'X', level: 'header', key: 'foo' })).toBe(false);
    expect(resolveBoardWriteBackAllowed({ source: 'd365', d365Field: null, level: 'header', key: 'foo' })).toBe(false);
    expect(resolveBoardWriteBackAllowed({ source: 'd365', d365Field: 'X', level: 'header', key: 'foo' })).toBe(true);
  });

  it('blocks system keys per level', () => {
    expect(resolveBoardWriteBackAllowed({ source: 'd365', d365Field: 'X', level: 'header', key: 'orderNumber' })).toBe(false);
    expect(resolveBoardWriteBackAllowed({ source: 'd365', d365Field: 'X', level: 'line', key: 'lineNumber' })).toBe(false);
    expect(resolveBoardWriteBackAllowed({ source: 'd365', d365Field: 'X', level: 'line', key: 'qty' })).toBe(true);
  });
});

describe('mapTbColumnToBoard', () => {
  it('passes through non-object input', () => {
    expect(mapTbColumnToBoard(null)).toBe(null);
    expect(mapTbColumnToBoard(undefined)).toBe(undefined);
  });

  it('maps tb column shape to board shape', () => {
    const mapped = mapTbColumnToBoard({
      key: 'qty',
      source: 'source',
      scope: 'detail',
      sourceField: 'PurchQty',
      writable: true,
    });
    expect(mapped).toMatchObject({
      key: 'qty',
      source: 'd365',
      level: 'line',
      d365Field: 'PurchQty',
      writableToD365: true,
      writeBackAllowed: true,
    });
  });

  it('keeps an existing level and falls back to header for master scope', () => {
    expect(mapTbColumnToBoard({ key: 'a', level: 'header', scope: 'detail' }).level).toBe('header');
    expect(mapTbColumnToBoard({ key: 'a', scope: 'master' }).level).toBe('header');
  });
});

describe('mapTbResponseToBoard', () => {
  it('passes through non-object input', () => {
    expect(mapTbResponseToBoard(null)).toBe(null);
  });

  it('maps rows/details/meta to orders/lines/columns', () => {
    const result = mapTbResponseToBoard({
      total: 1,
      rows: [{
        partitionKey: 'nl01',
        recordKey: 'PO-1',
        values: { status: 'Open' },
        historyByColumnId: { 101: true },
        isNew: 1,
        removedAtSource: true,
        syncRetained: false,
        detailCount: '2',
        details: [{
          detailKey: 10,
          values: { qty: 5 },
          historyByColumnId: { 201: true },
          isRemoved: true,
        }],
      }],
      meta: {
        columns: {
          master: [{ key: 'status', scope: 'master' }],
          detail: [{ key: 'qty', scope: 'detail' }],
        },
      },
    });

    expect(result.total).toBe(1);
    expect(result.orders).toHaveLength(1);
    const order = result.orders[0];
    expect(order).toMatchObject({
      dataAreaId: 'nl01',
      orderNumber: 'PO-1',
      values: { status: 'Open' },
      historyByColumnId: { 101: true },
      isNew: true,
      isChanged: false,
      removedInD365: true,
      syncRetained: false,
      lineCount: 2,
    });
    expect(order.lines).toEqual([{
      lineNumber: 10,
      values: { qty: 5 },
      historyByColumnId: { 201: true },
      trackMarksByColumnId: null,
      isNew: false,
      isChanged: false,
      isRemoved: true,
      changedFieldKeys: [],
    }]);
    expect(result.columns.header[0]).toMatchObject({ key: 'status', level: 'header' });
    expect(result.columns.line[0]).toMatchObject({ key: 'qty', level: 'line' });
  });

  it('marks lines as not-yet-loaded and keeps the rollup when details are omitted', () => {
    const result = mapTbResponseToBoard({
      rows: [{
        partitionKey: 'nl01',
        recordKey: 'PO-3',
        values: { status: 'Open' },
        detailCount: 4,
        hasChangedLine: true,
        productImageSummary: { firstItemNumber: 'ITEM-1', additionalItemCount: 2 },
        linkedLineValues: { itemNumbers: ['ITEM-1', 'ITEM-2'] },
      }],
    });

    const order = result.orders[0];
    expect(order.lines).toBe(null);
    expect(order.lineCount).toBe(4);
    expect(order.hasNewLine).toBe(false);
    expect(order.hasChangedLine).toBe(true);
    expect(order.hasRemovedLine).toBe(false);
    expect(order.productImageSummary).toEqual({ firstItemNumber: 'ITEM-1', additionalItemCount: 2 });
    expect(order.linkedLineValues).toEqual({ itemNumbers: ['ITEM-1', 'ITEM-2'] });
  });

  it('falls back to an empty product image summary when the rollup omits it', () => {
    const result = mapTbResponseToBoard({
      rows: [{ partitionKey: 'nl01', recordKey: 'PO-4' }],
    });
    expect(result.orders[0].productImageSummary).toEqual({ firstItemNumber: '', additionalItemCount: 0 });
    expect(result.orders[0].linkedLineValues).toBe(null);
  });

  it('keeps a removed row visible as retained when syncRetained is set', () => {
    const result = mapTbResponseToBoard({
      rows: [{ partitionKey: 'nl01', recordKey: 'PO-2', removedAtSource: true, syncRetained: true }],
    });
    expect(result.orders[0].removedInD365).toBe(false);
    expect(result.orders[0].syncRetained).toBe(true);
  });

  it('defaults missing rows and columns to empty collections', () => {
    const result = mapTbResponseToBoard({});
    expect(result.orders).toEqual([]);
    expect(result.columns).toEqual({ header: [], line: [] });
  });
});
