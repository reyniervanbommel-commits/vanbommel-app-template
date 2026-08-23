import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  default: ({ children }) => <th>{children}</th>,
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

function renderHeaderRow(activeRulesControls) {
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
});
