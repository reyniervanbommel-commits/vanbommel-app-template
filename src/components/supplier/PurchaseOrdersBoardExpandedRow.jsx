import React, { memo } from 'react';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';

function PurchaseOrdersBoardExpandedRow({
  expanded,
  rowData,
  tableConfig,
  cellActions,
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
          columns={lineColumns}
          onSaveValue={cellActions.onSaveValue}
          onRenameColumn={cellActions.onRenameColumn}
          onRemoveColumn={cellActions.onRemoveColumn}
          onCorrect={cellActions.onCorrect}
          isAdmin={cellActions.isAdmin}
          onToggleWriteback={cellActions.onToggleWriteback}
          onReorderColumn={cellActions.onReorderLineColumn}
          columnWidths={lineColumnWidths}
          columnTextStyles={lineColumnTextStyles}
          columnFormatRules={lineColumnFormatRules}
          onSaveColumnWidth={onSaveLineColumnWidth}
          onSaveColumnTextStyle={cellActions.onSaveLineColumnTextStyle}
          onSaveColumnFormatRules={cellActions.onSaveLineColumnFormatRules}
          reorderBusy={cellActions.reorderingColumns}
          summedLineColumnKeys={lineTotalColumns}
          onSetLineColumnTotal={cellActions.onSetLineColumnTotal}
          onPushLineTotalToHeader={cellActions.onPushLineTotalToHeader}
          onPushLineValuesToHeader={cellActions.onPushLineValuesToHeader}
          headerColumns={headerColumns}
          linkedLineTotalByHeaderKey={linkedLineTotalByHeaderKey}
          linkedLineValueByHeaderKey={linkedLineValueByHeaderKey}
        />
      </td>
    </tr>
  );
}

export default memo(PurchaseOrdersBoardExpandedRow);
