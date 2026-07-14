import React, { memo } from 'react';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';

function PurchaseOrdersBoardExpandedRow({
  expanded,
  rowData,
  tableConfig,
  cellActions,
  onVisibleLinesChange,
}) {
  if (!expanded) return null;

  const {
    rowId,
    order,
    lines,
  } = rowData;
  const {
    colCount,
    styles,
    lineColumns,
    lineColumnWidths,
    lineColumnTextStyles,
    lineColumnFormatRules,
    onSaveLineColumnWidth,
    lineTotalColumns,
    headerColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  } = tableConfig;

  return (
    <tr>
      <td colSpan={colCount} className={styles.subitemsContainer}>
        <PurchaseOrdersSubitemsTable
          rowId={rowId}
          order={order}
          lines={lines}
          columnConfig={{
            columns: lineColumns,
            columnWidths: lineColumnWidths,
            columnTextStyles: lineColumnTextStyles,
            columnFormatRules: lineColumnFormatRules,
            headerColumns,
            linkedLineTotalByHeaderKey,
            linkedLineValueByHeaderKey,
          }}
          mutationActions={{
            onSaveValue: cellActions.onSaveValue,
            onRenameColumn: cellActions.onRenameColumn,
            onRemoveColumn: cellActions.onRemoveColumn,
            onCorrect: cellActions.onCorrect,
            isAdmin: cellActions.isAdmin,
            onToggleWriteback: cellActions.onToggleWriteback,
            onReorderColumn: cellActions.onReorderLineColumn,
            onSaveColumnTextStyle: cellActions.onSaveLineColumnTextStyle,
            onSaveColumnFormatRules: cellActions.onSaveLineColumnFormatRules,
            onSetLineColumnTotal: cellActions.onSetLineColumnTotal,
            onPushLineTotalToHeader: cellActions.onPushLineTotalToHeader,
            onPushLineValuesToHeader: cellActions.onPushLineValuesToHeader,
          }}
          tableSettings={{
            reorderBusy: cellActions.reorderingColumns,
            summedLineColumnKeys: lineTotalColumns,
          }}
          tableCallbacks={{ onSaveColumnWidth: onSaveLineColumnWidth, onVisibleLinesChange }}
        />
      </td>
    </tr>
  );
}

export default memo(PurchaseOrdersBoardExpandedRow);
