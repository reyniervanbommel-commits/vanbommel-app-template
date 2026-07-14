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
      isNew: false,
      isChanged: false,
      isRemoved: true,
      changedFieldKeys: [],
    }]);
    expect(result.columns.header[0]).toMatchObject({ key: 'status', level: 'header' });
    expect(result.columns.line[0]).toMatchObject({ key: 'qty', level: 'line' });
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
