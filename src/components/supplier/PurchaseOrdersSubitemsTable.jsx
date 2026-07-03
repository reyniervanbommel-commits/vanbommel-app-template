import React, { useCallback, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrderTableView } from '../../hooks/usePurchaseOrderTableView';

const useStyles = makeStyles({
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  subHeaderCell: {
    position: 'relative',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '8px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
    textAlign: 'left',
    ':hover [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    ':focus-within [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  },
  headerCellContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('6px'),
  },
  headerCellLabel: {
    flexGrow: 1,
    minWidth: 0,
  },
  dragDropCell: { cursor: 'grab' },
  dragSourceCell: { opacity: 0.6 },
  dropBeforeCell: {
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-2px',
      top: '-1px',
      bottom: '-1px',
      width: '4px',
      backgroundColor: tokens.colorStrokeFocus2,
      zIndex: 6,
    },
  },
  dropAfterCell: {
    '::after': {
      content: '""',
      position: 'absolute',
      right: '-2px',
      top: '-1px',
      bottom: '-1px',
      width: '4px',
      backgroundColor: tokens.colorStrokeFocus2,
      zIndex: 6,
    },
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '8px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  empty: {
    ...shorthands.padding('8px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  noRowsCell: {
    ...shorthands.padding('8px'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export default function PurchaseOrdersSubitemsTable({
  rowId,
  order,
  lines,
  columns,
  onSaveValue,
  onRenameColumn,
  onRemoveColumn,
  onCorrect,
  isAdmin,
  onToggleWriteback,
  onReorderColumn,
  columnWidths = {},
  onSaveColumnWidth,
  reorderBusy = false,
}) {
  const styles = useStyles();
  const lineColumns = Array.isArray(columns) ? columns : [];
  const lineColumnDrag = useColumnReorderDrag({ onReorder: onReorderColumn, disabled: reorderBusy });
  const {
    processedItems: processedLines,
    filterByColumn,
    sortState,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    setSortDirection,
  } = usePurchaseOrderTableView({ items: lines, columns: lineColumns });
  const groupingColumnKey = '';
  const groupingColor = '';
  const noop = useCallback(() => {}, []);
  const visibleLines = useMemo(
    () => (Array.isArray(processedLines) ? processedLines : []),
    [processedLines]
  );

  if (!lineColumns.length) {
    return <div className={styles.empty}>Geen regelkolommen geconfigureerd.</div>;
  }

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          {lineColumns.map((column) => (
            <ResizableTableHeaderCell
              key={column.key}
              columnKey={column.key}
              width={columnWidths[column.key]}
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
                  <PurchaseOrderColumnHeader
                    column={column}
                    onRename={onRenameColumn}
                    onRemove={onRemoveColumn}
                    isAdmin={isAdmin}
                    onToggleWriteback={onToggleWriteback}
                    showActionsMenu={false}
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
                  onSetGroupingColumn={noop}
                  onClearGrouping={noop}
                  onSetGroupingColor={noop}
                />
              </div>
            </ResizableTableHeaderCell>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleLines.map((line, index) => (
          <tr key={`${rowId}-line-${line.lineNumber ?? index}`}>
            {lineColumns.map((column) => {
              const rawValue = line.values?.[column.key];
              const width = Number(columnWidths[column.key]);
              const cellStyle = Number.isFinite(width)
                ? { width: `${Math.round(width)}px`, minWidth: `${Math.round(width)}px` }
                : undefined;
              if (column.source === 'custom') {
                return (
                  <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell} style={cellStyle}>
                    <EditableCell
                      dataType={column.dataType}
                      value={rawValue}
                      options={column.options}
                      ariaLabel={`${column.label} voor regel ${line.lineNumber}`}
                      cellKeys={{
                        columnId: column.id,
                        dataAreaId: order.dataAreaId,
                        orderNumber: order.orderNumber,
                        lineNumber: line.lineNumber,
                      }}
                      onSave={(value) =>
                        onSaveValue({
                          columnId: column.id,
                          columnKey: column.key,
                          dataAreaId: order.dataAreaId,
                          orderNumber: order.orderNumber,
                          lineNumber: line.lineNumber,
                          value,
                        })
                      }
                    />
                  </td>
                );
              }
              if (column.source === 'd365' && column.writableToD365 && onCorrect) {
                return (
                  <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell} style={cellStyle}>
                    <PurchaseOrderWriteBackCell
                      column={column}
                      value={rawValue}
                      cellKeys={{
                        columnId: column.id,
                        dataAreaId: order.dataAreaId,
                        orderNumber: order.orderNumber,
                        lineNumber: line.lineNumber,
                      }}
                      onCorrect={({ value, basedOnValue }) =>
                        onCorrect({
                          columnId: column.id,
                          columnKey: column.key,
                          dataAreaId: order.dataAreaId,
                          orderNumber: order.orderNumber,
                          lineNumber: line.lineNumber,
                          value,
                          basedOnValue,
                        })
                      }
                    />
                  </td>
                );
              }
              return (
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell} style={cellStyle}>
                  {formatCellValue(rawValue, column.dataType)}
                </td>
              );
            })}
          </tr>
        ))}
        {!visibleLines.length ? (
          <tr>
            <td className={styles.noRowsCell} colSpan={lineColumns.length}>
              No lines match the active filters
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
