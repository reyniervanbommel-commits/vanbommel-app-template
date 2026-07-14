import React, { memo, useCallback, useMemo } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules, normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { isProductImageColumn } from '../../utils/purchaseOrderProductImageColumn';

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

const PurchaseOrderLineCellContent = memo(function PurchaseOrderLineCellContent({
  line,
  column,
  isFirstColumn,
  order,
  onSaveValue,
  onCorrect,
  styles,
}) {
  const rawValue = line.values?.[column.key];
  const showLineBadge = isFirstColumn && (line?.isNew || line?.isChanged || line?.isRemoved);
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
  const cellKeys = useMemo(() => ({
    columnId: column.id,
    dataAreaId: order.dataAreaId,
    orderNumber: order.orderNumber,
    lineNumber: line.lineNumber,
  }), [column.id, line.lineNumber, order.dataAreaId, order.orderNumber]);
  const handleSave = useCallback((value) => {
    onSaveValue({
      ...cellKeys,
      columnKey: column.key,
      value,
    });
  }, [cellKeys, column.key, onSaveValue]);
  const handleCorrect = useCallback(({ value, basedOnValue }) => {
    onCorrect({
      ...cellKeys,
      columnKey: column.key,
      value,
      basedOnValue,
    });
  }, [cellKeys, column.key, onCorrect]);
  const lineBadge = line?.isRemoved
    ? <Badge appearance="tint" color="danger" size="small">verwijderd</Badge>
    : (line?.isNew
      ? <Badge appearance="tint" color="success" size="small">nieuw</Badge>
      : (line?.isChanged ? <Badge appearance="tint" color="warning" size="small">gewijzigd</Badge> : null));

  let content;
  if (line?.isRemoved) {
    content = (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <span className={styles.removedText}>
          {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
        </span>
        {showLineBadge ? lineBadge : null}
      </span>
    );
  } else if (column.source === 'custom') {
    content = (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <EditableCell
          dataType={column.dataType}
          value={rawValue}
          options={column.options}
          ariaLabel={`${column.label} voor regel ${line.lineNumber}`}
          hasHistory={Boolean(line.historyByColumnId?.[column.id])}
          cellKeys={cellKeys}
          onSave={handleSave}
        />
        {showLineBadge ? lineBadge : null}
      </span>
    );
  } else if (column.source === 'd365' && column.writableToD365 && onCorrect) {
    content = (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <PurchaseOrderWriteBackCell
          column={column}
          value={rawValue}
          hasHistory={Boolean(line.historyByColumnId?.[column.id])}
          cellKeys={cellKeys}
          onCorrect={handleCorrect}
        />
        {showLineBadge ? lineBadge : null}
      </span>
    );
  } else {
    content = (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <span>
          {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
        </span>
        {showLineBadge ? lineBadge : null}
      </span>
    );
  }

  return content;
});

export default function PurchaseOrdersSubitemsBodyRows({
  rowId,
  order,
  lineColumns,
  visibleLines,
  cellPresentation,
  mutationActions,
  classNames,
  cellFilterActions,
}) {
  const styles = useStyles();
  const {
    columnWidths,
    columnTextStyles,
    columnFormatRules = {},
  } = cellPresentation;
  const { onSaveValue, onCorrect } = mutationActions;
  const { subCell: subCellClassName, noRowsCell: noRowsCellClassName } = classNames;
  const effectiveColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(columnFormatRules),
    [columnFormatRules]
  );
  const firstDataColumnKey = useMemo(
    () => lineColumns.find((column) => !isProductImageColumn(column))?.key || '',
    [lineColumns]
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
            return (
              <PurchaseOrderDataCell
                key={`${rowId}-${line.lineNumber ?? index}-${column.key}`}
                column={column}
                rawValue={rawValue}
                className={subCellClassName}
                style={cellStyle}
                filterByColumn={cellFilterActions?.filterByColumn}
                onApplyFilterFromCellValue={cellFilterActions?.applyFilterFromCellValue}
                onClearColumnFilter={cellFilterActions?.clearColumnFilter}
              >
                <PurchaseOrderLineCellContent
                  line={line}
                  column={column}
                  isFirstColumn={column.key === firstDataColumnKey}
                  order={order}
                  onSaveValue={onSaveValue}
                  onCorrect={onCorrect}
                  styles={styles}
                />
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
