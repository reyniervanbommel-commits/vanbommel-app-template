import React, { useMemo } from 'react';
import PurchaseOrderSubitemLineRow from './PurchaseOrderSubitemLineRow';
import { normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { isProductImageColumn } from '../../utils/purchaseOrderProductImageColumn';

export default function PurchaseOrdersSubitemsBodyRows({
  rowId,
  order,
  lineColumns,
  visibleLines,
  columnWidths,
  columnTextStyles,
  columnFormatRules = {},
  onSaveValue,
  onCorrect,
  onUpdateStatusOptions,
  isAdmin = false,
  subCellClassName,
  subCellContentClassName,
  noRowsCellClassName,
  connectorStyles,
  hasTotalsRow = false,
  showHistoryIndicators = true,
  collapsedLineColumnKeys = [],
}) {
  const effectiveColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(columnFormatRules),
    [columnFormatRules]
  );
  // Eén keer per subtabel bepalen i.p.v. per cel (voorheen O(kolommen² × regels)).
  const firstDataColumn = useMemo(
    () => (Array.isArray(lineColumns) ? lineColumns.find((column) => !isProductImageColumn(column)) : undefined),
    [lineColumns]
  );
  const rowCount = visibleLines.length;
  return (
    <tbody>
      {visibleLines.map((line, index) => (
        <PurchaseOrderSubitemLineRow
          key={`${rowId}-line-${line.lineNumber ?? index}`}
          rowId={rowId}
          order={order}
          line={line}
          index={index}
          rowCount={rowCount}
          hasTotalsRow={hasTotalsRow}
          lineColumns={lineColumns}
          firstDataColumn={firstDataColumn}
          columnWidths={columnWidths}
          columnTextStyles={columnTextStyles}
          columnFormatRules={effectiveColumnFormatRules}
          collapsedLineColumnKeys={collapsedLineColumnKeys}
          onSaveValue={onSaveValue}
          onCorrect={onCorrect}
          onUpdateStatusOptions={onUpdateStatusOptions}
          isAdmin={isAdmin}
          subCellClassName={subCellClassName}
          subCellContentClassName={subCellContentClassName}
          connectorStyles={connectorStyles}
          showHistoryIndicators={showHistoryIndicators}
        />
      ))}
      {!rowCount ? (
        <tr>
          {connectorStyles ? (
            <td
              className={`${connectorStyles.connectorCell} ${connectorStyles.connectorCellTrunkEnd}`}
              aria-hidden="true"
            />
          ) : null}
          <td className={noRowsCellClassName} colSpan={lineColumns.length}>
            No lines match the active filters
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
