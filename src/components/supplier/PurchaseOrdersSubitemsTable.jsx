import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
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
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  empty: {
    ...shorthands.padding('8px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export default function PurchaseOrdersSubitemsTable({ rowId, order, lines, columns, onSaveValue, onRenameColumn, onRemoveColumn, onCorrect, isAdmin, onToggleWriteback }) {
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
            <th key={column.key} className={styles.subHeaderCell}>
              <PurchaseOrderColumnHeader
                column={column}
                onRename={onRenameColumn}
                onRemove={onRemoveColumn}
                isAdmin={isAdmin}
                onToggleWriteback={onToggleWriteback}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${rowId}-line-${line.lineNumber ?? index}`}>
            {lineColumns.map((column) => {
              const rawValue = line.values?.[column.key];
              if (column.source === 'custom') {
                return (
                  <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell}>
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
                  <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell}>
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
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={styles.subCell}>
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
