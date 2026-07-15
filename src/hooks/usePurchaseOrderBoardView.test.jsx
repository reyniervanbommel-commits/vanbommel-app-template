import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { usePurchaseOrderBoardView } from './usePurchaseOrderBoardView';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';

const COLUMNS = [
  { key: 'status', dataType: 'text', label: 'Status' },
  { key: 'orderDate', dataType: 'date', label: 'Orderdatum' },
  { key: 'amount', dataType: 'number', label: 'Amount' },
];

const ITEMS = [
  { orderNumber: 'PO-1', dataAreaId: 'nl', values: { status: 'Open', orderDate: '2026-01-10', amount: 10 } },
  { orderNumber: 'PO-2', dataAreaId: 'nl', values: { status: 'Afgerond', orderDate: '2026-02-20', amount: 20 } },
];

describe('usePurchaseOrderTableView saved-view serialisatie', () => {
  it('round-trip: exportState levert wat applyState terugzet (filter + sort)', () => {
    const { result } = renderHook(() => usePurchaseOrderTableView({ items: ITEMS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({
        filterByColumn: { status: { operator: 'contains', value: 'open', secondaryValue: '' } },
        sortState: { columnKey: 'orderDate', direction: 'asc' },
      });
    });

    expect(result.current.sortState).toEqual({ columnKey: 'orderDate', direction: 'asc' });
    expect(result.current.filterByColumn.status.value).toBe('open');
    // Filter werkt: alleen de "Open"-order blijft over.
    expect(result.current.processedItems).toHaveLength(1);
    expect(result.current.processedItems[0].orderNumber).toBe('PO-1');

    const exported = result.current.exportState();
    expect(exported.sortState).toEqual({ columnKey: 'orderDate', direction: 'asc' });
    expect(exported.filterByColumn.status.value).toBe('open');
  });

  it('negeert onbekende kolom-keys bij het toepassen van een view (stale-key normalisatie)', () => {
    const { result } = renderHook(() => usePurchaseOrderTableView({ items: ITEMS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({
        filterByColumn: {
          status: { operator: 'contains', value: 'open', secondaryValue: '' },
          ghost: { operator: 'contains', value: 'x', secondaryValue: '' },
        },
        sortState: { columnKey: 'verwijderd', direction: 'asc' },
      });
    });

    // De verwijderde kolom 'ghost' zit niet in de state.
    expect(result.current.filterByColumn.ghost).toBeUndefined();
    expect(result.current.filterByColumn.status).toBeDefined();
    // Een sort op een niet-bestaande kolom valt terug op "geen sortering".
    expect(result.current.sortState).toEqual({ columnKey: '', direction: 'none' });
    // Er crasht niets en de geldige filter blijft actief.
    expect(result.current.processedItems).toHaveLength(1);
  });
});

describe('usePurchaseOrderBoardView linked line sortering', () => {
  it('resets activity filter when matching rows disappear (e.g. after mark as seen)', () => {
    const itemsWithNew = [
      { orderNumber: 'PO-1', dataAreaId: 'nl', isNew: true, values: { status: 'Open' } },
    ];
    const { result, rerender } = renderHook(
      ({ items }) => usePurchaseOrderBoardView({ items, columns: COLUMNS }),
      { initialProps: { items: itemsWithNew } }
    );

    act(() => {
      result.current.toggleActivityFilter('new');
    });
    expect(result.current.activityFilter).toBe('new');
    expect(result.current.processedItems).toHaveLength(1);

    rerender({
      items: [{ orderNumber: 'PO-1', dataAreaId: 'nl', isNew: false, values: { status: 'Open' } }],
    });
    expect(result.current.activityFilter).toBe('all');
    expect(result.current.processedItems).toHaveLength(1);
  });

  it('round-trips the activity filter as part of a saved view', () => {
    const itemsWithNew = [
      { orderNumber: 'PO-1', dataAreaId: 'nl', isNew: true, values: { status: 'Open' } },
      { orderNumber: 'PO-2', dataAreaId: 'nl', values: { status: 'Afgerond' } },
    ];
    const { result } = renderHook(() => usePurchaseOrderBoardView({ items: itemsWithNew, columns: COLUMNS }));

    act(() => {
      result.current.toggleActivityFilter('new');
    });
    const savedState = result.current.exportFilterSortGrouping();

    act(() => {
      result.current.toggleActivityFilter('changed');
      result.current.applyFilterSortGrouping(savedState);
    });

    expect(savedState.activityFilter).toBe('new');
    expect(result.current.activityFilter).toBe('new');
  });

  it('sorteert header-kolommen met gepushte line totals op de berekende som', () => {
    const columns = [
      { key: 'orderNumber', dataType: 'text', label: 'Order' },
      { key: 'lineAmountTotal', dataType: 'number', label: 'Line Amount Total' },
    ];
    const lineColumns = [
      { key: 'lineAmount', dataType: 'number', label: 'Line Amount' },
    ];
    const items = [
      {
        orderNumber: 'PO-2',
        dataAreaId: 'nl',
        values: { orderNumber: 'PO-2' },
        lines: [{ lineNumber: '10', values: { lineAmount: 20 } }],
      },
      {
        orderNumber: 'PO-1',
        dataAreaId: 'nl',
        values: { orderNumber: 'PO-1' },
        lines: [{ lineNumber: '10', values: { lineAmount: 10 } }],
      },
    ];

    const { result } = renderHook(() =>
      usePurchaseOrderBoardView({
        items,
        columns,
        lineColumns,
        lineTotalHeaderLinks: [{ lineColumnKey: 'lineAmount', headerColumnKey: 'lineAmountTotal' }],
      })
    );

    act(() => {
      result.current.setSortDirection('lineAmountTotal', 'asc');
    });

    expect(result.current.processedItems.map((order) => order.orderNumber)).toEqual(['PO-1', 'PO-2']);
  });
});

describe('usePurchaseOrderGrouping saved-view serialisatie', () => {
  const ROWS = ITEMS.map((order, index) => ({ order, rowId: 'row-' + index }));

  it('past een geldige grouping-kolom + kleur toe en exporteert die', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKey: 'status', color: '#abcdef' });
    });

    expect(result.current.groupingColumnKey).toBe('status');
    expect(result.current.groupingColor).toBe('#abcdef');
    expect(result.current.exportState()).toEqual({
      columnKeys: ['status'],
      columnKey: 'status',
      color: '#abcdef',
      colorsByColumn: { status: '#abcdef' },
      summaryColumnKeys: [],
    });
  });

  it('ondersteunt grouping op meerdere kolommen in selectie-volgorde', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKeys: ['status', 'orderDate'], color: '#abcdef' });
    });

    expect(result.current.groupingColumnKey).toBe('status,orderDate');
    expect(result.current.groupingColumnLabel).toBe('Status + Orderdatum');
    expect(result.current.groupedRows).toHaveLength(4);
    expect(
      result.current.groupedRows
        .filter((group) => group.groupColumnKey === 'orderDate')
        .map((group) => group.groupName)
    ).toEqual(['10/01/2026', '20/02/2026']);
    expect(result.current.exportState()).toEqual({
      columnKeys: ['status', 'orderDate'],
      columnKey: 'status',
      color: '#abcdef',
      colorsByColumn: { status: '#abcdef', orderDate: '#abcdef' },
      summaryColumnKeys: [],
    });
  });

  it('laat kleur per grouping-kolom apart instellen', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKeys: ['status', 'orderDate'], color: '#abcdef' });
      result.current.setGroupingBarColor('orderDate', '#123456');
    });

    expect(result.current.exportState().colorsByColumn).toEqual({
      status: '#abcdef',
      orderDate: '#123456',
    });
  });

  it('berekent number kolom-totalen voor group headers en serialiseert de keuze', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKey: 'status', color: '#abcdef', summaryColumnKeys: ['amount'] });
    });

    expect(result.current.summaryColumnKeys).toEqual(['amount']);
    expect(result.current.groupedRows.map((group) => group.groupSummaries)).toEqual([
      [{ columnKey: 'amount', label: 'Amount', value: 10, displayValue: '10' }],
      [{ columnKey: 'amount', label: 'Amount', value: 20, displayValue: '20' }],
    ]);
    expect(result.current.exportState().summaryColumnKeys).toEqual(['amount']);
  });

  it('valt terug op geen grouping bij een onbekende kolom-key', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKey: 'verwijderd', color: 'geen-hex' });
    });

    expect(result.current.groupingColumnKey).toBe('');
  });

  it('maakt geen fallback-groep op de eerste kolom als status ontbreekt', () => {
    const COLUMNS_WITHOUT_STATUS = [
      { key: 'orderNumber', dataType: 'text', label: 'Order' },
      { key: 'vendorName', dataType: 'text', label: 'Vendor' },
    ];
    const { result } = renderHook(() =>
      usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS_WITHOUT_STATUS })
    );

    expect(result.current.groupingColumnKey).toBe('');
    expect(result.current.groupedRows).toHaveLength(1);
    expect(result.current.groupedRows[0].groupName).toBe('');
  });

  it('houdt grouping uit na clearGrouping bij kolomwijzigingen', () => {
    const { result, rerender } = renderHook(
      ({ columns }) => usePurchaseOrderGrouping({ rows: ROWS, columns }),
      { initialProps: { columns: COLUMNS } }
    );

    act(() => {
      result.current.clearGrouping();
    });
    expect(result.current.groupingColumnKey).toBe('');

    rerender({
      columns: [
        ...COLUMNS,
        { key: 'vendorName', dataType: 'text', label: 'Vendor' },
      ],
    });
    expect(result.current.groupingColumnKey).toBe('');
  });
});
