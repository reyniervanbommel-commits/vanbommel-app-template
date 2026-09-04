import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';

vi.mock('./PurchaseOrdersBoardHeaderRow', () => ({
  default: () => <tr data-testid="header-row"><th>Header</th></tr>,
}));

vi.mock('./PurchaseOrdersBoardRows', () => ({
  default: () => <tbody data-testid="board-rows" />,
}));

vi.mock('./PurchaseOrderCellContextMenu', () => ({
  default: () => null,
}));

vi.mock('../../hooks/usePurchaseOrderBoardView', () => ({
  usePurchaseOrderBoardView: vi.fn(() => ({
    processedItems: [],
    rows: [],
    sortState: { columnKey: '', direction: 'none' },
    filterByColumn: {},
    groupedRows: [],
    groupingColumnKey: '',
    groupingColorsByColumn: {},
    groupSummaryColumnKeys: [],
    columnSums: { columnSumKeys: [], summedValuesByColumn: {}, setColumnSumColumn: vi.fn(), clearColumnSums: vi.fn() },
    setFilterOperator: vi.fn(),
    setFilterValue: vi.fn(),
    setFilterSecondaryValue: vi.fn(),
    applyColumnFilter: vi.fn(),
    clearColumnFilter: vi.fn(),
    applyFilterFromCellValue: vi.fn(),
    setSortDirection: vi.fn(),
    setGroupingColumn: vi.fn(),
    clearGrouping: vi.fn(),
    setGroupingBarColor: vi.fn(),
    setGroupSummaryColumn: vi.fn(),
    clearAllFilters: vi.fn(),
    activeFilterCount: 0,
  })),
}));

vi.mock('../../hooks/usePurchaseOrdersBoardExpansion', () => ({
  usePurchaseOrdersBoardExpansion: () => ({
    collapsedGroups: {},
    expandedOrders: {},
    handleSetExpansion: vi.fn(),
    ensureGroupsExpanded: vi.fn(),
    tableActions: {},
  }),
}));

vi.mock('../../hooks/usePurchaseOrderRowLocate', () => ({
  usePurchaseOrderRowLocate: () => null,
}));

vi.mock('../../hooks/usePurchaseOrdersBoardLinks', () => ({
  usePurchaseOrdersBoardLinks: () => ({
    linkedLineTotalByHeaderKey: {},
    linkedLineValueByHeaderKey: {},
  }),
}));

vi.mock('../../hooks/usePurchaseOrdersBoardStickyColumns', () => ({
  usePurchaseOrdersBoardStickyColumns: ({ columns }) => ({
    wrapperRef: { current: null },
    decoratedColumns: columns,
    stickyColumnKeys: [],
    firstNonStickyColumnKey: '',
    makeColumnSticky: vi.fn(),
  }),
}));

vi.mock('../../hooks/useColumnReorderDrag', () => ({
  useColumnReorderDrag: () => ({}),
}));

const BASE_COLUMNS = [{ key: 'status', label: 'Status', dataType: 'text' }];

function renderTable(boardViewOverrides = {}) {
  const clearAllFilters = vi.fn();
  const boardView = {
    processedItems: [],
    rows: [],
    sortState: { columnKey: '', direction: 'none' },
    filterByColumn: { status: { operator: 'equals', value: 'Missing', secondaryValue: '' } },
    groupedRows: [],
    groupingColumnKey: '',
    groupingColorsByColumn: {},
    groupSummaryColumnKeys: [],
    columnSums: { columnSumKeys: [], summedValuesByColumn: {}, setColumnSumColumn: vi.fn(), clearColumnSums: vi.fn() },
    setFilterOperator: vi.fn(),
    setFilterValue: vi.fn(),
    setFilterSecondaryValue: vi.fn(),
    applyColumnFilter: vi.fn(),
    clearColumnFilter: vi.fn(),
    applyFilterFromCellValue: vi.fn(),
    setSortDirection: vi.fn(),
    setGroupingColumn: vi.fn(),
    clearGrouping: vi.fn(),
    setGroupingBarColor: vi.fn(),
    setGroupSummaryColumn: vi.fn(),
    clearAllFilters,
    activeFilterCount: 1,
    ...boardViewOverrides,
  };

  render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrdersBoardTable
        data={{
          items: [{ orderNumber: 'PO-1' }],
          columns: BASE_COLUMNS,
          lineColumns: [],
          boardView,
        }}
        layout={{
          headerColumnWidths: {},
          stickyColumns: {},
          collapsedHeaderColumnKeys: [],
          collapsedLineColumnKeys: [],
        }}
        formatting={{
          headerColumnTextStyles: {},
          headerColumnFormatRules: {},
          lineColumnTextStyles: {},
          lineColumnFormatRules: {},
          lineColumnWidths: {},
        }}
        cellActions={{}}
        columnActions={{
          onRenameColumn: vi.fn(),
          onRemoveColumn: vi.fn(),
          isAdmin: true,
          onToggleWriteback: vi.fn(),
          onReorderHeaderColumn: vi.fn(),
          onReorderLineColumn: vi.fn(),
          onSaveHeaderColumnWidth: vi.fn(),
          onSaveLineColumnWidth: vi.fn(),
          onSaveHeaderColumnTextStyle: vi.fn(),
          onSaveHeaderColumnFormatRules: vi.fn(),
          onSaveLineColumnTextStyle: vi.fn(),
          onSaveLineColumnFormatRules: vi.fn(),
          onAddColumnRightOf: vi.fn(),
          onSetDatePeriodDisplayMode: vi.fn(),
          onEditingDone: vi.fn(),
          onToggleHeaderColumnCollapsed: vi.fn(),
          onToggleLineColumnCollapsed: vi.fn(),
          onToggleProductImageColumn: vi.fn(),
        }}
        linkActions={{
          onSetLineColumnTotal: vi.fn(),
          onPushLineTotalToHeader: vi.fn(),
          onPushLineValuesToHeader: vi.fn(),
        }}
        selection={{}}
        remarks={{}}
      />
    </FluentProvider>
  );

  return { clearAllFilters };
}

describe('PurchaseOrdersBoardTable empty filter state', () => {
  it('keeps column headers visible when filters return no rows', () => {
    renderTable();

    expect(screen.getByTestId('header-row')).toBeTruthy();
    expect(screen.getByText('No rows match the active filters')).toBeTruthy();
    expect(screen.queryByTestId('board-rows')).toBeNull();
  });

  it('shows Clear filters and calls clearAllFilters when active filters exist', () => {
    const { clearAllFilters } = renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(clearAllFilters).toHaveBeenCalledTimes(1);
  });

  it('hides Clear filters when no active column filters remain', () => {
    renderTable({ activeFilterCount: 0 });

    expect(screen.getByText('No rows match the active filters')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('renders the empty filter message outside the table so it stays in the visible viewport', () => {
    renderTable();

    const message = screen.getByText('No rows match the active filters');
    expect(message.closest('table')).toBeNull();
  });
});

describe('PurchaseOrdersBoardTable column widths', () => {
  it('renders a colgroup so column widths stay fixed while rows virtualize', () => {
    renderTable();
    expect(document.querySelectorAll('table colgroup col').length).toBe(2);
  });
});
