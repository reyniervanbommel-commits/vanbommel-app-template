import React from 'react';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

export default function PurchaseOrdersSubitemsBodyRows({
  rowId,
  order,
  lineColumns,
  visibleLines,
  columnWidths,
  columnTextStyles,
  onSaveValue,
  onCorrect,
  subCellClassName,
  noRowsCellClassName,
}) {
  return (
    <tbody>
      {visibleLines.map((line, index) => (
        <tr key={`${rowId}-line-${line.lineNumber ?? index}`}>
          {lineColumns.map((column) => {
            const rawValue = line.values?.[column.key];
            const cellStyle = getColumnCellStyle(columnWidths, columnTextStyles, column.key);
            if (column.source === 'custom') {
              return (
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                  <EditableCell
                    dataType={column.dataType}
                    value={rawValue}
                    options={column.options}
                    ariaLabel={`${column.label} voor regel ${line.lineNumber}`}
                    hasHistory={Boolean(line.historyByColumnId?.[column.id])}
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
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                  <PurchaseOrderWriteBackCell
                    column={column}
                    value={rawValue}
                    hasHistory={Boolean(line.historyByColumnId?.[column.id])}
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
              <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
              </td>
            );
          })}
        </tr>
      ))}
      {!visibleLines.length ? (
        <tr>
          <td className={noRowsCellClassName} colSpan={lineColumns.length}>
            No lines match the active filters
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
