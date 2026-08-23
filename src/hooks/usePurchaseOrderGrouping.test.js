import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';

const COLUMNS = [
  { key: 'status', label: 'Status', dataType: 'string' },
  { key: 'vendorAccount', label: 'Vendor', dataType: 'string' },
  { key: 'quantity', label: 'Quantity', dataType: 'number' },
  { key: 'deliveryDate', label: 'Delivery date', dataType: 'date' },
];

function row(values) {
  return { order: { values } };
}

const ROWS = [
  row({ status: 'Open', vendorAccount: 'V1', quantity: 10, deliveryDate: '2026-01-05' }),
  row({ status: 'Open', vendorAccount: 'V2', quantity: 5, deliveryDate: '2026-01-06' }),
  row({ status: 'Closed', vendorAccount: 'V1', quantity: 20, deliveryDate: null }),
];

// BELANGRIJK: kolommenlijsten altijd als stabiele referentie meegeven aan renderHook. Een inline
// `.filter()`/`.map()` binnen de renderHook-callback zelf produceert bij élke re-render een nieuwe
// array-identiteit, wat de hook's `useEffect(..., [safeColumns])` telkens opnieuw laat vuren →
// oneindige re-renderlus (geheugen loopt vol, zoals eerder in dit bestand gebeurde).
const COLUMNS_WITHOUT_STATUS = COLUMNS.filter((c) => c.key !== 'status');
const COLUMNS_WITHOUT_VENDOR = COLUMNS.filter((c) => c.key !== 'vendorAccount');

describe('usePurchaseOrderGrouping', () => {
  it('groepeert standaard op de status-kolom als die bestaat', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    expect(result.current.groupingColumnKeys).toEqual(['status']);
    const groupNames = result.current.groupedRows.map((g) => g.groupName).sort();
    expect(groupNames).toEqual(['Closed', 'Open']);
    const openGroup = result.current.groupedRows.find((g) => g.groupName === 'Open');
    expect(openGroup.entries).toHaveLength(2);
  });

  it('geeft één ongegroepeerde bucket met alle rijen als er geen status-kolom is', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS_WITHOUT_STATUS }));

    expect(result.current.groupingColumnKeys).toEqual([]);
    expect(result.current.groupedRows).toHaveLength(1);
    expect(result.current.groupedRows[0].entries).toHaveLength(3);
  });

  it('normaliseert null/undefined groepeerwaarden naar "No value"', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS_WITHOUT_STATUS }));

    act(() => result.current.setGroupingColumn('deliveryDate'));
    const noValueGroup = result.current.groupedRows.find((g) => g.groupName === 'No value');
    expect(noValueGroup).toBeDefined();
    expect(noValueGroup.entries).toHaveLength(1);
  });

  it('formatteert datumkolommen als dd/mm/yyyy in de groepnaam', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS_WITHOUT_STATUS }));

    act(() => result.current.setGroupingColumn('deliveryDate'));
    const groupNames = result.current.groupedRows.map((g) => g.groupName);
    expect(groupNames).toContain('05/01/2026');
  });

  it('setGroupingColumn voegt een tweede grouping-level toe (multi-level), clearGrouping haalt het weer weg', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => result.current.setGroupingColumn('vendorAccount'));
    expect(result.current.groupingColumnKeys).toEqual(['status', 'vendorAccount']);
    // Level 0 (status) groepen bestaan naast level 1 (vendorAccount) subgroepen in de platte lijst.
    expect(result.current.groupedRows.some((g) => g.groupLevel === 1)).toBe(true);

    act(() => result.current.clearGrouping('vendorAccount'));
    expect(result.current.groupingColumnKeys).toEqual(['status']);
  });

  it('clearGrouping() zonder argument wist alle grouping-kolommen ineens', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));
    act(() => result.current.clearGrouping());
    expect(result.current.groupingColumnKeys).toEqual([]);
  });

  it('setGroupingBarColor(kleur) past de kleur toe op alle actieve grouping-kolommen', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));
    act(() => result.current.setGroupingColumn('vendorAccount'));

    act(() => result.current.setGroupingBarColor('#123456'));
    expect(result.current.groupingColorsByColumn.status).toBe('#123456');
    expect(result.current.groupingColorsByColumn.vendorAccount).toBe('#123456');
  });

  it('accepteert een 8-cijferige hex-kleur met opacity', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));
    act(() => result.current.setGroupingBarColor('#123456b3'));
    expect(result.current.groupingColorsByColumn.status).toBe('#123456b3');
  });

  it('negeert een ongeldige (niet-hex) kleur', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));
    const before = result.current.groupingColorsByColumn.status;

    act(() => result.current.setGroupingBarColor('status', 'not-a-hex-color'));
    expect(result.current.groupingColorsByColumn.status).toBe(before);
  });

  it('setGroupSummaryColumn telt een numerieke kolom op per groep, negeert niet-numerieke kolommen', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => result.current.setGroupSummaryColumn('quantity', true));
    expect(result.current.summaryColumnKeys).toEqual(['quantity']);
    const openGroup = result.current.groupedRows.find((g) => g.groupName === 'Open');
    expect(openGroup.groupSummaries).toEqual([{ columnKey: 'quantity', label: 'Quantity', value: 15, displayValue: '15' }]);

    act(() => result.current.setGroupSummaryColumn('vendorAccount', true));
    expect(result.current.summaryColumnKeys).toEqual(['quantity']); // niet-numerieke kolom genegeerd

    act(() => result.current.clearGroupSummaries());
    expect(result.current.summaryColumnKeys).toEqual([]);
  });

  it('exportState/applyState maken de grouping-configuratie herbruikbaar (bv. voor saved views)', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));
    act(() => result.current.setGroupingColumn('vendorAccount'));
    act(() => result.current.setGroupingBarColor('vendorAccount', '#abcdef'));
    act(() => result.current.setGroupSummaryColumn('quantity', true));

    const exported = result.current.exportState();
    expect(exported.columnKeys).toEqual(['status', 'vendorAccount']);
    expect(exported.colorsByColumn.vendorAccount).toBe('#abcdef');
    expect(exported.summaryColumnKeys).toEqual(['quantity']);

    act(() => result.current.clearGrouping());
    act(() => result.current.clearGroupSummaries());
    expect(result.current.groupingColumnKeys).toEqual([]);

    act(() => result.current.applyState(exported));
    expect(result.current.groupingColumnKeys).toEqual(['status', 'vendorAccount']);
    expect(result.current.groupingColorsByColumn.vendorAccount).toBe('#abcdef');
    expect(result.current.summaryColumnKeys).toEqual(['quantity']);
  });

  it('applyState filtert kolomsleutels die niet (meer) bestaan in de huidige kolommen', () => {
    const { result } = renderHook(() => usePurchaseOrderGrouping({ rows: ROWS, columns: COLUMNS }));

    act(() => result.current.applyState({ columnKeys: ['status', 'removedColumn'], summaryColumnKeys: ['removedColumn'] }));

    expect(result.current.groupingColumnKeys).toEqual(['status']);
    expect(result.current.summaryColumnKeys).toEqual([]);
  });

  it('valt terug op de default grouping-kolom als de huidige kolom verdwijnt uit het kolommenmodel', () => {
    const { result, rerender } = renderHook(
      ({ columns }) => usePurchaseOrderGrouping({ rows: ROWS, columns }),
      { initialProps: { columns: COLUMNS } },
    );
    act(() => result.current.setGroupingColumn('vendorAccount'));
    act(() => result.current.clearGrouping('status'));
    expect(result.current.groupingColumnKeys).toEqual(['vendorAccount']);

    // vendorAccount-kolom verdwijnt uit het model — de hook valt terug op de status-default.
    rerender({ columns: COLUMNS_WITHOUT_VENDOR });
    expect(result.current.groupingColumnKeys).toEqual(['status']);
  });
});
