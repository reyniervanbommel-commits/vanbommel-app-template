import React, { memo } from 'react';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

function PurchaseOrderLineTotalsRow({
  rowId,
  lineColumns,
  summedColumnsSet,
  summedValuesByColumn,
  totalsCellClassName,
}) {
  return (
    <tfoot>
      <tr>
        {lineColumns.map((column) => (
          <td key={`${rowId}-sum-${column.key}`} className={totalsCellClassName}>
            {summedColumnsSet.has(column.key) ? formatCellValue(summedValuesByColumn[column.key], 'number') : ''}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

export default memo(PurchaseOrderLineTotalsRow);
