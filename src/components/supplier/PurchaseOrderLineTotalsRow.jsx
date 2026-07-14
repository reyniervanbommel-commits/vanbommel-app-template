import React, { memo } from 'react';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

function PurchaseOrderLineTotalsRow({
  rowId,
  lineColumns,
  summedColumnsSet,
  summedValuesByColumn,
  totalsCellClassName,
  connectorTotalsCellClassName = '',
}) {
  return (
    <tfoot>
      <tr>
        {connectorTotalsCellClassName ? (
          <td className={connectorTotalsCellClassName} aria-hidden="true" />
        ) : null}
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
