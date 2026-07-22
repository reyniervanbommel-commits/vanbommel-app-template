import React, { memo, useEffect, useRef } from 'react';
import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';
import { useLineDetails } from './lineDetailsContext';
import { lineDetailsKey } from '../../hooks/usePurchaseOrderLineDetails';

// De sublijnen zitten niet in de board-payload; ze worden opgehaald zodra een order
// wordt opengeklapt. rowData.lines is alleen gevuld in de debug-vorm (?includeDetails=1).
function ExpandedRowContent({ rowData, tableConfig, cellActions, onMeasureExpanded }) {
  const { rowId, order, lines: eagerLines } = rowData;
  const lineDetails = useLineDetails();
  const { loadLines } = lineDetails || {};
  const entry = lineDetails?.entries?.get(lineDetailsKey(order.dataAreaId, order.orderNumber));
  const lines = Array.isArray(eagerLines) ? eagerLines : entry?.lines;
  const rowRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(eagerLines) || !loadLines) return;
    if (entry?.status === 'loading' || entry?.status === 'ready') return;
    loadLines(order.dataAreaId, order.orderNumber);
  }, [eagerLines, entry?.status, loadLines, order.dataAreaId, order.orderNumber]);

  // Meet de werkelijke hoogte van de opengeklapte rij zodat de board-virtualisatie
  // (variabele hoogtes) de scrollhoogte correct houdt. Re-meet bij het inladen van de
  // regels (spinner -> tabel) en bij formaat-wijzigingen (bijv. images die inladen).
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof onMeasureExpanded !== 'function') return undefined;
    const report = () => onMeasureExpanded(rowId, el.getBoundingClientRect().height);
    report();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [onMeasureExpanded, rowId, lines]);

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
    <tr ref={rowRef}>
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

function PurchaseOrdersBoardExpandedRow({ expanded, rowData, tableConfig, cellActions, onMeasureExpanded }) {
  if (!expanded) return null;
  return (
    <ExpandedRowContent
      rowData={rowData}
      tableConfig={tableConfig}
      cellActions={cellActions}
      onMeasureExpanded={onMeasureExpanded}
    />
  );
}

export default memo(PurchaseOrdersBoardExpandedRow);
