import { describe, expect, it } from 'vitest';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { renderHook, act } from '@testing-library/react';

describe('usePurchaseOrderTableView equals filter', () => {
  const columns = [
    { key: 'status', dataType: 'text' },
    { key: 'amount', dataType: 'number' },
    { key: 'delivery', dataType: 'date' },
  ];

  const items = [
    { values: { status: 'Open', amount: 10, delivery: '2026-03-15' } },
    { values: { status: 'Closed', amount: 20, delivery: '2026-04-01' } },
    { values: { status: '', amount: null, delivery: null } },
  ];

  it('filters text columns with equals on raw value', () => {
    const { result } = renderHook(() => usePurchaseOrderTableView({ items, columns }));

    act(() => {
      result.current.applyFilterFromCellValue('status', 'Open');
    });

    expect(result.current.processedItems).toHaveLength(1);
    expect(result.current.processedItems[0].values.status).toBe('Open');
    expect(result.current.filterByColumn.status).toEqual({
      operator: 'equals',
      value: 'Open',
      secondaryValue: '',
    });
  });

  it('filters empty cells with equals', () => {
    const { result } = renderHook(() => usePurchaseOrderTableView({ items, columns }));

    act(() => {
      result.current.applyFilterFromCellValue('status', null);
    });

    expect(result.current.processedItems).toHaveLength(1);
    expect(result.current.processedItems[0].values.status).toBe('');
  });

  it('filters date columns with equals on same calendar day', () => {
    const { result } = renderHook(() => usePurchaseOrderTableView({ items, columns }));

    act(() => {
      result.current.applyFilterFromCellValue('delivery', '2026-03-15T08:00:00Z');
    });

    expect(result.current.processedItems).toHaveLength(1);
    expect(result.current.filterByColumn.delivery.operator).toBe('equals');
    expect(result.current.filterByColumn.delivery.value).toBe('2026-03-15');
  });

  it('sorts date period week columns numerically', () => {
    const weekColumn = {
      key: 'deliveryWeek',
      dataType: 'date_period',
      options: { sourceColumnKey: 'requestedDeliveryDate' },
    };
    const weekItems = [
      { values: { deliveryWeek: '12' } },
      { values: { deliveryWeek: '2' } },
      { values: { deliveryWeek: '5' } },
    ];
    const { result } = renderHook(() => usePurchaseOrderTableView({
      items: weekItems,
      columns: [weekColumn],
      datePeriodDisplayModes: { deliveryWeek: 'week' },
    }));

    act(() => {
      result.current.setSortDirection('deliveryWeek', 'asc');
    });

    expect(result.current.processedItems.map((item) => item.values.deliveryWeek)).toEqual(['2', '5', '12']);
  });
});
