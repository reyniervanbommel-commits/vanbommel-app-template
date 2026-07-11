import React, { useMemo } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules, normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

const useStyles = makeStyles({
  statusWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
  },
  removedText: {
    color: tokens.colorNeutralForeground3,
    textDecorationLine: 'line-through',
  },
});

function resolveLineRowFormatColor(line, lineColumns, columnFormatRules) {
  if (line?.isRemoved) return '';
  for (const column of Array.isArray(lineColumns) ? lineColumns : []) {
    const ruleSet = columnFormatRules[column.key];
    if (!ruleSet || ruleSet.target !== 'row') continue;
    const color = evalFormatRules(line?.values?.[column.key], ruleSet, line?.values || {});
    if (color) return color;
  }
  return '';
}

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
  subCellClassName,
  noRowsCellClassName,
}) {
  const styles = useStyles();
  const effectiveColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(columnFormatRules),
    [columnFormatRules]
  );
  return (
    <tbody>
      {visibleLines.map((line, index) => {
        const rowFormatColor = resolveLineRowFormatColor(line, lineColumns, effectiveColumnFormatRules);
        return (
        <tr
          key={`${rowId}-line-${line.lineNumber ?? index}`}
          style={!line?.isRemoved && rowFormatColor ? { backgroundColor: rowFormatColor } : undefined}
        >
          {lineColumns.map((column) => {
            const rawValue = line.values?.[column.key];
            const changedFieldKeys = Array.isArray(line?.changedFieldKeys) ? line.changedFieldKeys : [];
            const isChangedCell = !line?.isRemoved && !line?.isNew && changedFieldKeys.includes(column.key);
            const ruleSet = effectiveColumnFormatRules?.[column.key];
            const cellFormatColor = (!line?.isRemoved && ruleSet?.target === 'cell')
              ? evalFormatRules(rawValue, ruleSet, line?.values || {})
              : '';
            const fallbackBackground = line?.isRemoved ? '#f3f2f1' : (isChangedCell ? '#fff4ce' : '');
            const cellStyle = getColumnCellStyle(
              columnWidths,
              columnTextStyles,
              column.key,
              cellFormatColor || fallbackBackground
            );
            const showLineBadge = column === lineColumns[0] && (line?.isNew || line?.isChanged || line?.isRemoved);
            const lineBadge = line?.isRemoved
              ? <Badge appearance="tint" color="danger" size="small">verwijderd</Badge>
              : (line?.isNew
                ? <Badge appearance="tint" color="success" size="small">nieuw</Badge>
                : (line?.isChanged ? <Badge appearance="tint" color="warning" size="small">gewijzigd</Badge> : null));
            if (line?.isRemoved) {
              return (
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                  <span className={showLineBadge ? styles.statusWrap : undefined}>
                    <span className={styles.removedText}>
                      {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
                    </span>
                    {showLineBadge ? lineBadge : null}
                  </span>
                </td>
              );
            }
            if (column.source === 'custom') {
              return (
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                  <span className={showLineBadge ? styles.statusWrap : undefined}>
                    <EditableCell
                      dataType={column.dataType}
                      value={rawValue}
                      options={column.options}
                      ariaLabel={`${column.label} voor regel ${line.lineNumber}`}
                      hasHistory={Boolean(line.historyByColumnId?.[column.id])}
                      cellKeys={{
                        columnId: column.id,
                        dataAreaId: order.dataAreaId,
                        orderNumber: order.orderNumber,
                        lineNumber: line.lineNumber,
                      }}
                      onSave={(value) =>
                        onSaveValue({
                          columnId: column.id,
                          columnKey: column.key,
                          dataAreaId: order.dataAreaId,
                          orderNumber: order.orderNumber,
                          lineNumber: line.lineNumber,
                          value,
                        })
                      }
                    />
                    {showLineBadge ? lineBadge : null}
                  </span>
                </td>
              );
            }
            if (column.source === 'd365' && column.writableToD365 && onCorrect) {
              return (
                <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                  <span className={showLineBadge ? styles.statusWrap : undefined}>
                    <PurchaseOrderWriteBackCell
                      column={column}
                      value={rawValue}
                      hasHistory={Boolean(line.historyByColumnId?.[column.id])}
                      cellKeys={{
                        columnId: column.id,
                        dataAreaId: order.dataAreaId,
                        orderNumber: order.orderNumber,
                        lineNumber: line.lineNumber,
                      }}
                      onCorrect={({ value, basedOnValue }) =>
                        onCorrect({
                          columnId: column.id,
                          columnKey: column.key,
                          dataAreaId: order.dataAreaId,
                          orderNumber: order.orderNumber,
                          lineNumber: line.lineNumber,
                          value,
                          basedOnValue,
                        })
                      }
                    />
                    {showLineBadge ? lineBadge : null}
                  </span>
                </td>
              );
            }
            return (
              <td key={`${rowId}-${line.lineNumber ?? index}-${column.key}`} className={subCellClassName} style={cellStyle}>
                <span className={showLineBadge ? styles.statusWrap : undefined}>
                  <span className={line?.isRemoved ? styles.removedText : undefined}>
                    {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
                  </span>
                  {showLineBadge ? lineBadge : null}
                </span>
              </td>
            );
          })}
        </tr>
        );
      })}
      {!visibleLines.length ? (
        <tr>
          <td className={noRowsCellClassName} colSpan={lineColumns.length}>
            No lines match the active filters
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
