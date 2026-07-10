import React from 'react';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { isColumnFilterActive } from './purchaseOrderColumnFilterMenuConstants';

export default function PurchaseOrdersBoardHeaderRow({
  styles,
  selection,
  showBoardHeaders,
  showGroupHeaders,
  onSetExpansion,
  onToggleBoardHeaders,
  onToggleGroupHeaders,
  columns,
  headerColumnDrag,
  headerColumnWidths,
  onSaveHeaderColumnWidth,
  onRenameColumn,
  onRemoveColumn,
  isAdmin,
  onToggleWriteback,
  editingColumnKey,
  onEditingDone,
  linkedLineTotalByHeaderKey,
  linkedLineValueByHeaderKey,
  filterByColumn,
  sortState,
  groupingColumnKey,
  groupingColor,
  setSortDirection,
  setFilterOperator,
  setFilterValue,
  setFilterSecondaryValue,
  clearColumnFilter,
  setGroupingColumn,
  clearGrouping,
  setGroupingBarColor,
  onAddColumnRightOf,
  headerColumnTextStyles,
  onSaveHeaderColumnTextStyle,
}) {
  return (
    <tr>
      <PurchaseOrdersTableControls
        showBoardHeaders={showBoardHeaders}
        showGroupHeaders={showGroupHeaders}
        onSetExpansion={onSetExpansion}
        onToggleBoardHeaders={onToggleBoardHeaders}
        onToggleGroupHeaders={onToggleGroupHeaders}
        selectionEnabled={Boolean(selection?.enabled)}
        allSelected={Boolean(selection?.allSelected)}
        someSelected={Boolean(selection?.someSelected)}
        onToggleAll={selection?.onToggleAll}
      />
      {columns.map((column) => {
        const hasActiveFilter = isColumnFilterActive(column, filterByColumn[column.key]);
        return (
          <ResizableTableHeaderCell
            key={column.key}
            columnKey={column.key}
            data-col-key={column.key}
            width={headerColumnWidths[column.key]}
            className={[styles.headerCell, headerColumnDrag.canDrag ? styles.dragDropCell : '', headerColumnDrag.draggingKey === column.key ? styles.dragSourceCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'before' ? styles.dropBeforeCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'after' ? styles.dropAfterCell : ''].filter(Boolean).join(' ')}
            onResizeEnd={onSaveHeaderColumnWidth}
            {...headerColumnDrag.getCellDragProps(column.key)}
          >
            <div className={styles.headerCellContent}>
              <div className={styles.headerCellLabel}>
                <PurchaseOrderColumnHeader
                  column={column}
                  onRename={onRenameColumn}
                  onRemove={onRemoveColumn}
                  isAdmin={isAdmin}
                  onToggleWriteback={onToggleWriteback}
                  showActionsMenu={false}
                  autoEdit={editingColumnKey === column.key}
                  onEditingDone={onEditingDone}
                  showFilterIndicator={hasActiveFilter}
                  showConnectionIndicator={Boolean(linkedLineTotalByHeaderKey[column.key] || linkedLineValueByHeaderKey[column.key])}
                />
              </div>
              <PurchaseOrderColumnFilterMenu
                column={column}
                filter={filterByColumn[column.key]}
                sortState={sortState}
                groupingColumnKey={groupingColumnKey}
                groupingColor={groupingColor}
                isAdmin={isAdmin}
                onToggleWriteback={onToggleWriteback}
                onSetSortDirection={setSortDirection}
                onSetOperator={setFilterOperator}
                onSetValue={setFilterValue}
                onSetSecondaryValue={setFilterSecondaryValue}
                onClearFilter={clearColumnFilter}
                onSetGroupingColumn={setGroupingColumn}
                onClearGrouping={clearGrouping}
                onSetGroupingColor={setGroupingBarColor}
                onAddColumnRightOf={onAddColumnRightOf}
                onRenameColumn={onRenameColumn}
                onRemoveColumn={onRemoveColumn}
                columnTextStyle={headerColumnTextStyles[column.key]}
                onSetColumnTextStyle={onSaveHeaderColumnTextStyle}
              />
            </div>
          </ResizableTableHeaderCell>
        );
      })}
    </tr>
  );
}
