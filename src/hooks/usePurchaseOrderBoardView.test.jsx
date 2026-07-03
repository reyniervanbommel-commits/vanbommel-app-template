import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';

const COLUMNS = [
  { key: 'status', dataType: 'text', label: 'Status' },
  { key: 'orderDate', dataType: 'date', label: 'Orderdatum' },
];

const ITEMS = [
  { orderNumber: 'PO-1', dataAreaId: 'nl', values: { status: 'Open', orderDate: '2026-01-10' } },
  { orderNumber: 'PO-2', dataAreaId: 'nl', values: { status: 'Afgerond', orderDate: '2026-02-20' } },
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

describe('usePurchaseOrderGrouping saved-view serialisatie', () => {
  const ROWS = ITEMS.map((order, index) => ({ order, rowId: 'row-' + index }));

  it('past een geldige grouping-kolom + kleur toe en exporteert die', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKey: 'status', color: '#abcdef' });
    });

    expect(result.current.groupingColumnKey).toBe('status');
    expect(result.current.groupingColor).toBe('#abcdef');
    expect(result.current.exportState()).toEqual({ columnKey: 'status', color: '#abcdef' });
  });

  it('valt terug op geen grouping bij een onbekende kolom-key', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyState({ columnKey: 'verwijderd', color: 'geen-hex' });
    });

    expect(result.current.groupingColumnKey).toBe('');
  });
});
