import React, { memo, useMemo } from 'react';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import PurchaseOrderCollapsedColumnCell from './PurchaseOrderCollapsedColumnCell';
import { isColumnCollapsed } from '../../utils/collapsedColumnUtils';

function PurchaseOrdersBoardTotalsCell({
  column,
  displayValue,
  collapsedHeaderColumnKeys,
  totalsCellClassName,
}) {
  const stickyLeft = Number(column?.stickyLeft);
  const isStickyColumn = Number.isFinite(stickyLeft);
  const cellStyle = useMemo(() => (
    isStickyColumn
      ? { left: `${stickyLeft}px`, bottom: 0, zIndex: 2, position: 'sticky' }
      : undefined
  ), [isStickyColumn, stickyLeft]);

  if (isColumnCollapsed(column.key, collapsedHeaderColumnKeys)) {
    return (
      <PurchaseOrderCollapsedColumnCell
        columnKey={column.key}
        className={totalsCellClassName}
        cellStyle={cellStyle}
      />
    );
  }

  return (
    <td className={totalsCellClassName} style={cellStyle}>
      {displayValue}
    </td>
  );
}

function totalsDisplayValue(columnKey, columnSumKeys, summedValuesByColumn) {
  if (!columnSumKeys.includes(columnKey)) return '';
  return formatCellValue(summedValuesByColumn[columnKey], 'number');
}

function PurchaseOrdersBoardTotalsRow({
  columns,
  columnSumKeys,
  summedValuesByColumn,
  collapsedHeaderColumnKeys,
  totalsCellClassName,
  controlCellClassName,
}) {
  return (
    <tfoot>
      <tr>
        <td className={controlCellClassName} aria-hidden="true" />
        {columns.map((column) => (
          <PurchaseOrdersBoardTotalsCell
            key={column.key}
            column={column}
            displayValue={totalsDisplayValue(column.key, columnSumKeys, summedValuesByColumn)}
            collapsedHeaderColumnKeys={collapsedHeaderColumnKeys}
            totalsCellClassName={totalsCellClassName}
          />
        ))}
      </tr>
    </tfoot>
  );
}

export default memo(PurchaseOrdersBoardTotalsRow);
