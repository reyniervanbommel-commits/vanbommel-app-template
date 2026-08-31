import { describe, expect, it } from 'vitest';
import { describeViewStateDiff, VIEW_STATE_DIFF_MAX_ROWS } from './viewStateDiff';

const columns = [
  { key: 'status', label: 'Status', dataType: 'text' },
  { key: 'vendorAccount', label: 'Vendor', dataType: 'text' },
];

function baseState(overrides = {}) {
  return {
    showHistoryIndicators: true,
    vendorAccount: '',
    columns: {
      visibleColumns: ['status', 'vendorAccount'],
      columnOrder: ['status', 'vendorAccount'],
      stickyColumnKeys: [],
    },
    table: {
      filterByColumn: {},
      sortState: null,
      grouping: { columnKeys: [] },
      activityFilter: 'all',
      columnSumKeys: [],
    },
    tabs: { extraTabs: [], groups: [] },
    ...overrides,
  };
}

describe('describeViewStateDiff', () => {
  it('geeft geen rijen als saved en current gelijk zijn', () => {
    const state = baseState();
    expect(describeViewStateDiff(state, state, { columns })).toEqual({
      rows: [],
      moreCount: 0,
    });
  });

  it('beschrijft een toegevoegd filter met kolomlabel', () => {
    const saved = baseState();
    const current = baseState({
      table: {
        ...baseState().table,
        filterByColumn: {
          status: { operator: 'equals', value: 'Open', secondaryValue: '' },
        },
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({
      kind: 'filter',
      label: 'Filter added:',
      detail: 'Status is exactly Open',
    });
  });

  it('beschrijft een gewijzigd en een verwijderd filter', () => {
    const saved = baseState({
      table: {
        ...baseState().table,
        filterByColumn: {
          status: { operator: 'equals', value: 'Open', secondaryValue: '' },
          vendorAccount: { operator: 'contains', value: 'Q00', secondaryValue: '' },
        },
      },
    });
    const current = baseState({
      table: {
        ...baseState().table,
        filterByColumn: {
          status: { operator: 'equals', value: 'Closed', secondaryValue: '' },
        },
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({
      kind: 'filter',
      label: 'Filter changed:',
      detail: 'Status is exactly Closed',
    });
    expect(rows).toContainEqual({
      kind: 'filter',
      label: 'Filter removed:',
      detail: 'Vendor',
    });
  });

  it('beschrijft getoonde en verborgen kolommen', () => {
    const saved = baseState({
      columns: { visibleColumns: ['status'], columnOrder: ['status'], stickyColumnKeys: [] },
    });
    const current = baseState({
      columns: {
        visibleColumns: ['vendorAccount'],
        columnOrder: ['vendorAccount'],
        stickyColumnKeys: [],
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({ kind: 'column', label: 'Column shown:', detail: 'Vendor' });
    expect(rows).toContainEqual({ kind: 'column', label: 'Column hidden:', detail: 'Status' });
  });

  it('beschrijft extra tabs die zijn toegevoegd of verwijderd', () => {
    const saved = baseState({
      tabs: {
        extraTabs: [{ id: 'tab_old', name: 'Old vendor', extraFilters: {} }],
        groups: [],
      },
    });
    const current = baseState({
      tabs: {
        extraTabs: [{ id: 'tab_new', name: 'New vendor', extraFilters: {} }],
        groups: [],
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({ kind: 'category', label: 'Tab added:', detail: 'New vendor' });
    expect(rows).toContainEqual({ kind: 'category', label: 'Tab removed:', detail: 'Old vendor' });
  });

  it('beschrijft grouping- en history-wijzigingen', () => {
    const saved = baseState();
    const current = baseState({
      showHistoryIndicators: false,
      table: {
        ...baseState().table,
        grouping: { columnKeys: ['vendorAccount'] },
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({ kind: 'category', label: 'Grouping:', detail: 'Vendor' });
    expect(rows).toContainEqual({ kind: 'column', label: 'History indicators:', detail: 'off' });
  });

  it('vangt overige kolomlayout-wijzigingen in één regel', () => {
    const saved = baseState();
    const current = baseState({
      columns: {
        ...baseState().columns,
        headerColumnWidths: { status: 180 },
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({ kind: 'column', label: 'Column layout:', detail: 'changed' });
  });

  it('merkt sortering en conditional formatting apart', () => {
    const saved = baseState();
    const current = baseState({
      table: {
        ...baseState().table,
        sortState: { columnKey: 'status', direction: 'asc' },
      },
      columns: {
        ...baseState().columns,
        headerColumnFormatRules: { status: { rules: [{ color: '#e2445c' }] } },
      },
    });
    const { rows } = describeViewStateDiff(saved, current, { columns });
    expect(rows).toContainEqual({ kind: 'sort', label: 'Sort:', detail: 'Status' });
    expect(rows).toContainEqual({ kind: 'format', label: 'Conditional formatting:', detail: 'changed' });
  });

  it(`kapt af op ${VIEW_STATE_DIFF_MAX_ROWS} rijen en telt de rest`, () => {
    const saved = baseState({ columns: { visibleColumns: [], columnOrder: [], stickyColumnKeys: [] } });
    const manyKeys = Array.from({ length: 12 }, (_, index) => `col_${index}`);
    const current = baseState({
      columns: { visibleColumns: manyKeys, columnOrder: manyKeys, stickyColumnKeys: [] },
    });
    const result = describeViewStateDiff(saved, current, {
      columns: manyKeys.map((key) => ({ key, label: key })),
    });
    expect(result.rows).toHaveLength(VIEW_STATE_DIFF_MAX_ROWS);
    expect(result.moreCount).toBe(12 - VIEW_STATE_DIFF_MAX_ROWS);
  });
});
