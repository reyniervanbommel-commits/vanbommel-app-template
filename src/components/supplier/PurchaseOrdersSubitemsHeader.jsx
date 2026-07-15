import React, { memo } from 'react';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import PurchaseOrderProductImageColumnHeader from './PurchaseOrderProductImageColumnHeader';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { isColumnFilterActive, isColumnFormatRuleSetActive } from './purchaseOrderColumnFilterMenuConstants';
import { isProductImageColumn, PRODUCT_IMAGE_MIN_COLUMN_WIDTH } from '../../utils/purchaseOrderProductImageColumn';

function PurchaseOrdersSubitemsHeader({
  lineColumns,
  columnWidths,
  columnTextStyles,
  columnFormatRules,
  summedColumnsSet,
  lineColumnConnectionTargets,
  lineColumnDrag,
  tableView,
  columnActions,
  styles,
}) {
  const {
    filterByColumn,
    sortState,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    setSortDirection,
  } = tableView;
  const {
    isAdmin,
    isStaff = true,
    onToggleWriteback,
    onRenameColumn,
    onRemoveColumn,
    onSaveColumnWidth,
    onSaveColumnTextStyle,
    onSaveColumnFormatRules,
    onSetLineColumnTotal,
    onPushLineTotalToHeader,
    onPushLineValuesToHeader,
    noop,
  } = columnActions;

  return (
    <thead>
      <tr>
        {lineColumns.map((column) => {
          const isSystemColumn = isProductImageColumn(column);
          const hasActiveFilter = isColumnFilterActive(column, filterByColumn[column.key]);
          const hasActiveConditionalFormatting = isColumnFormatRuleSetActive(columnFormatRules[column.key]);
          const connectionTargets = lineColumnConnectionTargets[column.key] || [];
          return (
            <ResizableTableHeaderCell
              key={column.key}
              columnKey={column.key}
              width={columnWidths[column.key]}
              minWidth={isSystemColumn ? PRODUCT_IMAGE_MIN_COLUMN_WIDTH : undefined}
              className={[
                styles.subHeaderCell,
                lineColumnDrag.canDrag ? styles.dragDropCell : '',
                lineColumnDrag.draggingKey === column.key ? styles.dragSourceCell : '',
                lineColumnDrag.dropTargetKey === column.key && lineColumnDrag.dropTargetPosition === 'before' ? styles.dropBeforeCell : '',
                lineColumnDrag.dropTargetKey === column.key && lineColumnDrag.dropTargetPosition === 'after' ? styles.dropAfterCell : '',
              ].filter(Boolean).join(' ')}
              onResizeEnd={onSaveColumnWidth}
              {...lineColumnDrag.getCellDragProps(column.key)}
            >
              <div className={styles.headerCellContent}>
                <div className={styles.headerCellLabel}>
                  {isSystemColumn ? (
                    <PurchaseOrderProductImageColumnHeader label={column.label} />
                  ) : (
                    <PurchaseOrderColumnHeader
                      column={column}
                      onRename={onRenameColumn}
                      onRemove={onRemoveColumn}
                      isAdmin={isAdmin}
                      onToggleWriteback={onToggleWriteback}
                      showActionsMenu={false}
                      showFilterIndicator={hasActiveFilter}
                      showConditionalFormattingIndicator={hasActiveConditionalFormatting}
                      showSumIndicator={summedColumnsSet.has(column.key)}
                      showConnectionIndicator={connectionTargets.length > 0}
                    />
                  )}
                </div>
                {!isSystemColumn ? (
                  <PurchaseOrderColumnFilterMenu
                  column={column}
                  filter={filterByColumn[column.key]}
                  sortState={sortState}
                  groupingColumnKey=""
                  groupingColor=""
                  isAdmin={isAdmin}
                  isStaff={isStaff}
                  onToggleWriteback={onToggleWriteback}
                  onSetSortDirection={setSortDirection}
                  onSetOperator={setFilterOperator}
                  onSetValue={setFilterValue}
                  onSetSecondaryValue={setFilterSecondaryValue}
                  onClearFilter={clearColumnFilter}
                  onSetGroupingColumn={noop}
                  onClearGrouping={noop}
                  onSetGroupingColor={noop}
                  onRenameColumn={onRenameColumn}
                  onRemoveColumn={onRemoveColumn}
                  isLineColumnSummed={summedColumnsSet.has(column.key)}
                  onToggleLineColumnSum={onSetLineColumnTotal}
                  onPushLineTotalToHeader={onPushLineTotalToHeader}
                  onPushLineValuesToHeader={onPushLineValuesToHeader}
                  columnTextStyle={columnTextStyles[column.key]}
                  onSetColumnTextStyle={onSaveColumnTextStyle}
                  columnFormatRuleSet={columnFormatRules[column.key]}
                  onSetColumnFormatRules={onSaveColumnFormatRules}
                  referenceColumns={lineColumns}
                  connectionTargets={connectionTargets}
                />
                ) : null}
              </div>
            </ResizableTableHeaderCell>
          );
        })}
      </tr>
    </thead>
  );
}

export default memo(PurchaseOrdersSubitemsHeader);
