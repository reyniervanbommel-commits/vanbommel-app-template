import React from 'react';
import { tokens } from '@fluentui/react-components';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { isColumnFilterActive, isColumnFormatRuleSetActive } from './purchaseOrderColumnFilterMenuConstants';

export default function PurchaseOrdersBoardHeaderRow({
  styles,
  selection,
  onSetExpansion,
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
  lineColumns = [],
  filterByColumn,
  sortState,
  groupingColumnKey,
  groupingColorsByColumn = {},
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
  headerColumnFormatRules = {},
  onSaveHeaderColumnFormatRules,
  referenceColumns = [],
  stickyColumnKeys = [],
  firstNonStickyColumnKey = '',
  onMakeColumnSticky,
}) {
  return (
    <tr>
      <PurchaseOrdersTableControls
        onSetExpansion={onSetExpansion}
        selectionEnabled={Boolean(selection?.enabled)}
        allSelected={Boolean(selection?.allSelected)}
        someSelected={Boolean(selection?.someSelected)}
        onToggleAll={selection?.onToggleAll}
      />
      {columns.map((column) => {
        const hasActiveFilter = isColumnFilterActive(column, filterByColumn[column.key]);
        const hasActiveConditionalFormatting = isColumnFormatRuleSetActive(headerColumnFormatRules[column.key]);
        const connectionTargets = [];
        const linkedTotalColumnKey = linkedLineTotalByHeaderKey[column.key];
        const linkedValueMeta = linkedLineValueByHeaderKey[column.key];
        if (linkedTotalColumnKey) {
          const lineColumnLabel = lineColumns.find((lineColumn) => lineColumn.key === linkedTotalColumnKey)?.label || linkedTotalColumnKey;
          connectionTargets.push(`Subitem column "${lineColumnLabel}" (total)`);
        }
        if (linkedValueMeta?.lineColumnKey) {
          const lineColumnLabel = lineColumns.find((lineColumn) => lineColumn.key === linkedValueMeta.lineColumnKey)?.label || linkedValueMeta.lineColumnKey;
          connectionTargets.push(`Subitem column "${lineColumnLabel}" (values)`);
        }
        const stickyLeft = Number(column?.stickyLeft);
        const isStickyColumn = Number.isFinite(stickyLeft);
        const canPromoteToSticky = column.key === firstNonStickyColumnKey;
        const isRightMostStickyColumn = isStickyColumn && column.key === stickyColumnKeys[stickyColumnKeys.length - 1];
        const canToggleStickyAction = canPromoteToSticky || isRightMostStickyColumn;
        const stickyHeaderStyle = isStickyColumn
          ? {
            left: `${stickyLeft}px`,
            zIndex: 3,
          }
          : undefined;
        return (
          <ResizableTableHeaderCell
            key={column.key}
            columnKey={column.key}
            data-col-key={column.key}
            width={headerColumnWidths[column.key]}
            className={[styles.headerCell, headerColumnDrag.canDrag ? styles.dragDropCell : '', headerColumnDrag.draggingKey === column.key ? styles.dragSourceCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'before' ? styles.dropBeforeCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'after' ? styles.dropAfterCell : ''].filter(Boolean).join(' ')}
            onResizeEnd={onSaveHeaderColumnWidth}
            cellStyle={stickyHeaderStyle}
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
                  showConditionalFormattingIndicator={hasActiveConditionalFormatting}
                  showConnectionIndicator={Boolean(linkedLineTotalByHeaderKey[column.key] || linkedLineValueByHeaderKey[column.key])}
                />
              </div>
              <PurchaseOrderColumnFilterMenu
                column={column}
                filter={filterByColumn[column.key]}
                sortState={sortState}
                groupingColumnKey={groupingColumnKey}
                groupingColor={groupingColorsByColumn[column.key] || '#f4e6ed'}
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
                columnFormatRuleSet={headerColumnFormatRules[column.key]}
                onSetColumnFormatRules={onSaveHeaderColumnFormatRules}
                referenceColumns={referenceColumns}
                isConnectedType={Boolean(linkedLineValueByHeaderKey[column.key])}
                connectionTargets={connectionTargets}
                canMakeColumnSticky={typeof onMakeColumnSticky === 'function'}
                isStickyColumn={isStickyColumn}
                isStickyActionEnabled={canToggleStickyAction}
                stickyColumnCount={stickyColumnKeys.length}
                onMakeColumnSticky={onMakeColumnSticky}
              />
            </div>
          </ResizableTableHeaderCell>
        );
      })}
    </tr>
  );
}
