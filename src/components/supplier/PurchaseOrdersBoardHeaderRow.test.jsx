import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PO_HEADER_HOVER_DELAY_MS } from '../../hooks/usePoColumnHeaderHover';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';

vi.mock('./PurchaseOrderColumnHeader', () => ({
  default: ({ column }) => <span>{column.label}</span>,
}));

vi.mock('./PurchaseOrderColumnFilterMenu', () => ({
  default: () => <button type="button">Column menu</button>,
}));

vi.mock('./PurchaseOrderProductImageColumnHeader', () => ({
  default: ({ label }) => <span>{label}</span>,
}));

vi.mock('./PurchaseOrderProductImageColumnMenu', () => ({
  default: () => null,
}));

vi.mock('./ResizableTableHeaderCell', () => ({
  default: ({ children, className, cellStyle, 'data-col-key': dataColKey, 'data-column-filtered': dataColumnFiltered }) => (
    <th className={className} style={cellStyle} data-col-key={dataColKey} data-column-filtered={dataColumnFiltered}>{children}</th>
  ),
}));

vi.mock('./PurchaseOrderCollapsedColumnCell', () => ({
  PurchaseOrderCollapsedColumnHeaderCell: () => <th />,
}));

const styles = {
  headerCell: 'headerCell',
  headerCellFiltered: 'headerCellFiltered',
  dragDropCell: 'dragDropCell',
  dragSourceCell: 'dragSourceCell',
  dropBeforeCell: 'dropBeforeCell',
  dropAfterCell: 'dropAfterCell',
  headerCellContent: 'headerCellContent',
  headerCellLabel: 'headerCellLabel',
};

const headerColumnDrag = {
  canDrag: false,
  draggingKey: '',
  dropTargetKey: '',
  dropTargetPosition: '',
  getCellDragProps: () => ({}),
};

function renderHeaderRow(activeRulesControls, extraProps = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <table>
        <thead>
          <PurchaseOrdersBoardHeaderRow
            styles={styles}
            selection={{}}
            onSetExpansion={vi.fn()}
            columns={[{ key: 'vendor', label: 'Vendor', dataType: 'text' }]}
            headerColumnDrag={headerColumnDrag}
            headerColumnWidths={{}}
            onSaveHeaderColumnWidth={vi.fn()}
            onRenameColumn={vi.fn()}
            onRemoveColumn={vi.fn()}
            isAdmin
            isStaff
            onToggleWriteback={vi.fn()}
            linkedLineTotalByHeaderKey={{}}
            linkedLineValueByHeaderKey={{}}
            filterByColumn={{}}
            sortState={{ columnKey: '', direction: 'none' }}
            setSortDirection={vi.fn()}
            setFilterOperator={vi.fn()}
            setFilterValue={vi.fn()}
            setFilterSecondaryValue={vi.fn()}
            applyColumnFilter={vi.fn()}
            clearColumnFilter={vi.fn()}
            setColumnColorFilter={vi.fn()}
            setGroupingColumn={vi.fn()}
            clearGrouping={vi.fn()}
            setGroupingBarColor={vi.fn()}
            setGroupSummaryColumn={vi.fn()}
            onAddColumnRightOf={vi.fn()}
            onSetDatePeriodDisplayMode={vi.fn()}
            headerColumnTextStyles={{}}
            onSaveHeaderColumnTextStyle={vi.fn()}
            headerColumnFormatRules={{}}
            onSaveHeaderColumnFormatRules={vi.fn()}
            activeRulesControls={activeRulesControls}
            {...extraProps}
          />
        </thead>
      </table>
    </FluentProvider>
  );
}

describe('PurchaseOrdersBoardHeaderRow', () => {
  it('opens the active filters and formatting flyout from table controls', () => {
    const onOpenFlyout = vi.fn();

    renderHeaderRow({ hasActive: true, onOpenFlyout });

    const button = screen.getByRole('button', {
      name: 'Show active filters and formatting (active)',
    });
    expect(button).toBeTruthy();

    fireEvent.click(button);

    expect(onOpenFlyout).toHaveBeenCalledTimes(1);
  });

  describe('column header hover', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the active filter after the hover delay', async () => {
      renderHeaderRow(undefined, {
        filterByColumn: { vendor: { operator: 'contains', value: 'Acme' } },
      });

      fireEvent.mouseOver(screen.getByText('Vendor'));
      expect(screen.queryByRole('tooltip')).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PO_HEADER_HOVER_DELAY_MS);
      });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toBe('contains: Acme');
    });

    it('does not show a hover when the column has no filter', async () => {
      renderHeaderRow();

      fireEvent.mouseOver(screen.getByText('Vendor'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PO_HEADER_HOVER_DELAY_MS);
      });

      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });
});
