import React, { memo, useCallback, useEffect, useState } from 'react';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrdersBoardExpandedRow from './PurchaseOrdersBoardExpandedRow';
import PurchaseOrdersBoardRowControls from './PurchaseOrdersBoardRowControls';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules } from './columnFormatRuleUtils';

function getOrderRowClassName(order, styles) {
  if (order.removedInD365) return `${styles.itemRow} ${styles.removedRow}`;
  if (order.isNew) return `${styles.itemRow} ${styles.newRow}`;
  if (order.isChanged) return `${styles.itemRow} ${styles.changedRow}`;
  return styles.itemRow;
}

function resolveRowFormatColor(order, columns, headerColumnFormatRules) {
  if (order?.removedInD365) return '';
  for (const column of columns) {
    const ruleSet = headerColumnFormatRules[column.key];
    if (!ruleSet || ruleSet.target !== 'row') continue;
    const color = evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {});
    if (color) return color;
  }
  return '';
}

function PurchaseOrdersBoardOrderRows({
  rowData,
  boardConfig,
  cellActions,
  selection,
  cellFilterActions,
}) {
  const { rowId, order, lines, isExpanded, selectionKey } = rowData;
  const [visibleProductLines, setVisibleProductLines] = useState(lines);
  const handleVisibleLinesChange = useCallback((nextVisibleLines) => {
    setVisibleProductLines(nextVisibleLines);
  }, []);
  useEffect(() => {
    if (!isExpanded) setVisibleProductLines(lines);
  }, [isExpanded, lines]);
  const {
    styles,
    columns,
    headerColumnWidths,
    headerColumnTextStyles,
    headerColumnFormatRules,
    tableConfig,
    onToggleOrder,
  } = boardConfig;
  const hasLines = lines.length > 0;
  const rowFormatColor = resolveRowFormatColor(order, columns, headerColumnFormatRules);

  return (
    <>
      <tr
        className={getOrderRowClassName(order, styles)}
        style={!order.removedInD365 && rowFormatColor ? { backgroundColor: rowFormatColor } : undefined}
      >
        <PurchaseOrdersBoardRowControls
          order={order}
          rowId={rowId}
          hasLines={hasLines}
          isExpanded={isExpanded}
          selection={selection}
          selectionKey={selectionKey}
          onToggleOrder={onToggleOrder}
          styles={styles}
        />
        {columns.map((column) => {
          const ruleSet = headerColumnFormatRules?.[column.key];
          const cellFormatColor = (!order.removedInD365 && ruleSet?.target === 'cell')
            ? evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {})
            : '';
          const rawValue = order?.values?.[column.key];
          return (
            <PurchaseOrderDataCell
              key={`${rowId}-${column.key}`}
              column={column}
              rawValue={rawValue}
              className={styles.itemCell}
              style={getColumnCellStyle(headerColumnWidths, headerColumnTextStyles, column.key, cellFormatColor)}
              filterByColumn={cellFilterActions?.filterByColumn}
              onApplyFilterFromCellValue={cellFilterActions?.applyFilterFromCellValue}
              onClearColumnFilter={cellFilterActions?.clearColumnFilter}
              linkedLineTotalKeys={tableConfig.linkedLineTotalByHeaderKey}
              linkedLineValueKeys={tableConfig.linkedLineValueByHeaderKey}
            >
              <PurchaseOrderHeaderCellContent
                order={order}
                column={column}
                onSaveValue={cellActions.onSaveValue}
                onCorrect={cellActions.onCorrect}
                linkedLineTotalMap={tableConfig.linkedLineTotalByHeaderKey}
                linkedLineValueMap={tableConfig.linkedLineValueByHeaderKey}
                productImageLines={visibleProductLines}
              />
            </PurchaseOrderDataCell>
          );
        })}
      </tr>
      <PurchaseOrdersBoardExpandedRow
        expanded={hasLines && isExpanded}
        rowData={{ rowId, order, lines }}
        tableConfig={tableConfig}
        cellActions={cellActions}
        onVisibleLinesChange={handleVisibleLinesChange}
      />
    </>
  );
}

export default memo(PurchaseOrdersBoardOrderRows);
