import React, { memo } from 'react';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import PurchaseOrderCollapsedColumnCell from './PurchaseOrderCollapsedColumnCell';
import { isColumnCollapsed } from '../../utils/collapsedColumnUtils';

function PurchaseOrderLineTotalsRow({
  rowId,
  lineColumns,
  summedColumnsSet,
  summedValuesByColumn,
  totalsCellClassName,
  connectorTotalsCellClassName = '',
  collapsedLineColumnKeys = [],
}) {
  return (
    <tfoot>
      <tr>
        {connectorTotalsCellClassName ? (
          <td className={connectorTotalsCellClassName} aria-hidden="true" />
        ) : null}
        {lineColumns.map((column) => (
          isColumnCollapsed(column.key, collapsedLineColumnKeys) ? (
            <PurchaseOrderCollapsedColumnCell
              key={`${rowId}-sum-${column.key}`}
              columnKey={column.key}
            />
          ) : (
          <td key={`${rowId}-sum-${column.key}`} className={totalsCellClassName}>
            {summedColumnsSet.has(column.key) ? formatCellValue(summedValuesByColumn[column.key], 'number') : ''}
          </td>
          )
        ))}
      </tr>
    </tfoot>
  );
}

export default memo(PurchaseOrderLineTotalsRow);
