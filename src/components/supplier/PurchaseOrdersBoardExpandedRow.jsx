import React, { memo, useEffect } from 'react';
import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';
import { useLineDetails } from './lineDetailsContext';
import { lineDetailsKey } from '../../hooks/usePurchaseOrderLineDetails';

// De sublijnen zitten niet in de board-payload; ze worden opgehaald zodra een order
// wordt opengeklapt. rowData.lines is alleen gevuld in de debug-vorm (?includeDetails=1).
function ExpandedRowContent({ rowData, tableConfig, cellActions }) {
  const { rowId, order, lines: eagerLines } = rowData;
  const lineDetails = useLineDetails();
  const { loadLines } = lineDetails || {};
  const entry = lineDetails?.entries?.get(lineDetailsKey(order.dataAreaId, order.orderNumber));
  const lines = Array.isArray(eagerLines) ? eagerLines : entry?.lines;

  useEffect(() => {
    if (Array.isArray(eagerLines) || !loadLines) return;
    if (entry?.status === 'loading' || entry?.status === 'ready') return;
    loadLines(order.dataAreaId, order.orderNumber);
  }, [eagerLines, entry?.status, loadLines, order.dataAreaId, order.orderNumber]);

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
    collapsedLineColumnKeys = [],
    onToggleLineColumnCollapsed,
  } = tableConfig;

  return (
    <tr>
      <td colSpan={colCount} className={styles.subitemsContainer}>
        {!Array.isArray(lines) ? (
          entry?.status === 'error' ? (
            <MessageBar intent="error">
              <MessageBarBody>{entry.error || 'Loading order lines failed'}</MessageBarBody>
            </MessageBar>
          ) : (
            <Spinner size="tiny" labelPosition="after" label="Loading order lines..." />
          )
        ) : (
          <PurchaseOrdersSubitemsTable
            rowId={rowId}
            order={order}
            lines={lines}
            columns={lineColumns}
            onSaveValue={cellActions.onSaveValue}
            onRenameColumn={cellActions.onRenameColumn}
            onUpdateStatusOptions={cellActions.onUpdateStatusOptions}
            onRemoveColumn={cellActions.onRemoveColumn}
            onCorrect={cellActions.onCorrect}
            isAdmin={cellActions.isAdmin}
            isStaff={cellActions.isStaff}
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
            collapsedLineColumnKeys={collapsedLineColumnKeys}
            onToggleLineColumnCollapsed={onToggleLineColumnCollapsed}
            showHistoryIndicators={cellActions.showHistoryIndicators}
          />
        )}
      </td>
    </tr>
  );
}

function PurchaseOrdersBoardExpandedRow({ expanded, rowData, tableConfig, cellActions }) {
  if (!expanded) return null;
  return <ExpandedRowContent rowData={rowData} tableConfig={tableConfig} cellActions={cellActions} />;
}

export default memo(PurchaseOrdersBoardExpandedRow);
