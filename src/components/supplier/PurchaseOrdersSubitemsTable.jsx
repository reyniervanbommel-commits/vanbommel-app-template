import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

const useStyles = makeStyles({
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  subHeaderCell: {
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
              className={styles.subHeaderCell}
              onResizeEnd={onSaveColumnWidth}
            >
              <PurchaseOrderColumnHeader
                column={column}
                onRename={onRenameColumn}
                onRemove={onRemoveColumn}
                isAdmin={isAdmin}
                onToggleWriteback={onToggleWriteback}
                onMoveColumn={onReorderColumn}
                reorderBusy={reorderBusy}
              />
            </ResizableTableHeaderCell>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
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
      </tbody>
    </table>
  );
}
