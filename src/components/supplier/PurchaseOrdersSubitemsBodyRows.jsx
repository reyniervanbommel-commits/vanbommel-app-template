import React, { useMemo } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules, normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import {
  getProductImageCellStyle,
  isProductImageColumn,
  PRODUCT_IMAGE_SUB_CELL_HEIGHT,
} from '../../utils/purchaseOrderProductImageColumn';

const useStyles = makeStyles({
  statusWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
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

function renderLineCellContent({
  line,
  column,
  lineColumns,
  order,
  onSaveValue,
  onCorrect,
  styles,
}) {
  const rawValue = line.values?.[column.key];
  const firstDataColumn = lineColumns.find((entry) => !isProductImageColumn(entry));
  const showLineBadge = column === firstDataColumn && (line?.isNew || line?.isChanged || line?.isRemoved);
  const itemNumber = line?.itemNumber ?? line?.values?.itemNumber;

  if (isProductImageColumn(column)) {
    if (line?.isRemoved) return null;
    return (
      <PurchaseOrderProductImageCell
        dataAreaId={order.dataAreaId}
        itemNumber={itemNumber}
      />
    );
  }

  const lineBadge = line?.isRemoved
    ? <Badge appearance="tint" color="danger" size="small">verwijderd</Badge>
    : (line?.isNew
      ? <Badge appearance="tint" color="success" size="small">nieuw</Badge>
      : (line?.isChanged ? <Badge appearance="tint" color="warning" size="small">gewijzigd</Badge> : null));

  if (line?.isRemoved) {
    return (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <span className={styles.removedText}>
          {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
        </span>
        {showLineBadge ? lineBadge : null}
      </span>
    );
  }
  if (column.source === 'custom') {
    return (
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
    );
  }
  if (column.source === 'd365' && column.writableToD365 && onCorrect) {
    return (
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
    );
  }
  return (
    <span className={showLineBadge ? styles.statusWrap : undefined}>
      <span className={line?.isRemoved ? styles.removedText : undefined}>
        {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
      </span>
      {showLineBadge ? lineBadge : null}
    </span>
  );
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
  subCellContentClassName,
  noRowsCellClassName,
  cellFilterActions,
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
            const baseCellStyle = getColumnCellStyle(
              columnWidths,
              columnTextStyles,
              column.key,
              cellFormatColor || fallbackBackground
            );
            const isImageColumn = isProductImageColumn(column);
            const cellStyle = isImageColumn
              ? getProductImageCellStyle(baseCellStyle, PRODUCT_IMAGE_SUB_CELL_HEIGHT)
              : baseCellStyle;
            return (
              <PurchaseOrderDataCell
                key={`${rowId}-${line.lineNumber ?? index}-${column.key}`}
                cell={{ column, rawValue, order }}
                layout={{
                  className: subCellClassName,
                  contentClassName: isImageColumn ? undefined : subCellContentClassName,
                  style: cellStyle,
                }}
              >
                {renderLineCellContent({
                  line,
                  column,
                  lineColumns,
                  order,
                  onSaveValue,
                  onCorrect,
                  styles,
                })}
              </PurchaseOrderDataCell>
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
