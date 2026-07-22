import React, { memo } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import StatusCell from './StatusCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { getColumnCellStyle, getFormattedCellContentStyle, FORMATTED_CELL_TEXT_COLOR } from './columnTextStyleUtils';
import { evalFormatRules } from './columnFormatRuleUtils';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { resolveSubitemConnectorCellClassName } from './purchaseOrderSubitemConnectorStyles';
import { isStatusColumn, resolveStatusCellColor } from '../../utils/statusColumnUtils';
import {
  getProductImageCellStyle,
  isProductImageColumn,
  PRODUCT_IMAGE_SUB_CELL_HEIGHT,
} from '../../utils/purchaseOrderProductImageColumn';
import PurchaseOrderCollapsedColumnCell from './PurchaseOrderCollapsedColumnCell';
import { isColumnCollapsed } from '../../utils/collapsedColumnUtils';

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

export function resolveLineRowFormatColor(line, lineColumns, columnFormatRules) {
  if (line?.isRemoved) return '';
  for (const column of Array.isArray(lineColumns) ? lineColumns : []) {
    const ruleSet = columnFormatRules[column.key];
    if (!ruleSet || ruleSet.target !== 'row') continue;
    const statusOptions = isStatusColumn(column) ? column.options : null;
    const color = evalFormatRules(line?.values?.[column.key], ruleSet, line?.values || {}, statusOptions);
    if (color) return color;
  }
  return '';
}

function resolveLineCellBackground({ line, column, ruleSet, rowFormatColor, isChangedCell }) {
  const rawValue = line?.values?.[column.key];
  const statusOptions = isStatusColumn(column) ? column.options : null;
  const cellFormatColor = (!line?.isRemoved && ruleSet?.target === 'cell')
    ? evalFormatRules(rawValue, ruleSet, line?.values || {}, statusOptions)
    : '';
  if (cellFormatColor) {
    return { backgroundColor: cellFormatColor, isConditionalFormat: true };
  }
  if (!line?.isRemoved && rowFormatColor) {
    return { backgroundColor: rowFormatColor, isConditionalFormat: true };
  }
  if (isStatusColumn(column)) {
    return {
      backgroundColor: resolveStatusCellColor(rawValue, column.options),
      isConditionalFormat: false,
    };
  }
  if (line?.isRemoved) return { backgroundColor: '#f3f2f1', isConditionalFormat: false };
  if (isChangedCell) return { backgroundColor: '#fff4ce', isConditionalFormat: false };
  return { backgroundColor: '', isConditionalFormat: false };
}

function renderLineCellContent({
  line,
  column,
  firstDataColumn,
  order,
  onSaveValue,
  onCorrect,
  onUpdateStatusOptions,
  isAdmin = false,
  styles,
  cellBackgroundColor = '',
  isConditionalFormat = false,
  showHistoryIndicators = true,
}) {
  const rawValue = line.values?.[column.key];
  const showHistory = showHistoryIndicators !== false && Boolean(line.historyByColumnId?.[column.id]);
  const showLineBadge = column === firstDataColumn && (line?.isNew || line?.isChanged || line?.isRemoved);
  const itemNumber = line?.itemNumber ?? line?.values?.itemNumber;

  if (isProductImageColumn(column)) {
    if (line?.isRemoved) return null;
    return (
      <PurchaseOrderProductImageCell
        dataAreaId={order.dataAreaId}
        itemNumber={itemNumber}
        isConditionalFormat={isConditionalFormat}
      />
    );
  }

  const lineBadge = line?.isRemoved
    ? <Badge appearance="tint" color="danger" size="small">removed</Badge>
    : (line?.isNew
      ? <Badge appearance="tint" color="success" size="small">new</Badge>
      : (line?.isChanged ? <Badge appearance="tint" color="warning" size="small">changed</Badge> : null));

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
    if (isStatusColumn(column)) {
      return (
        <span className={showLineBadge ? styles.statusWrap : undefined}>
          <StatusCell
            value={rawValue}
            options={column.options}
            isAdmin={isAdmin}
            ariaLabel={`${column.label} for line ${line.lineNumber}`}
            hasHistory={showHistory}
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
            onUpdateOptions={(options) =>
              onUpdateStatusOptions?.(column.id, options, column.label)
            }
          />
          {showLineBadge ? lineBadge : null}
        </span>
      );
    }
    return (
      <span className={showLineBadge ? styles.statusWrap : undefined}>
        <EditableCell
          dataType={column.dataType}
          value={rawValue}
          options={column.options}
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          ariaLabel={`${column.label} for line ${line.lineNumber}`}
          hasHistory={showHistory}
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
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          hasHistory={showHistory}
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
      <span
        className={line?.isRemoved ? styles.removedText : undefined}
        style={isConditionalFormat ? { color: FORMATTED_CELL_TEXT_COLOR } : undefined}
      >
        {formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label })}
      </span>
      {showLineBadge ? lineBadge : null}
    </span>
  );
}

function PurchaseOrderSubitemLineRow({
  rowId,
  order,
  line,
  index,
  rowCount,
  hasTotalsRow,
  lineColumns,
  firstDataColumn,
  columnWidths,
  columnTextStyles,
  columnFormatRules,
  collapsedLineColumnKeys,
  onSaveValue,
  onCorrect,
  onUpdateStatusOptions,
  isAdmin,
  subCellClassName,
  subCellContentClassName,
  connectorStyles,
  showHistoryIndicators,
}) {
  const styles = useStyles();
  const rowFormatColor = resolveLineRowFormatColor(line, lineColumns, columnFormatRules);
  const connectorCellClassName = connectorStyles
    ? resolveSubitemConnectorCellClassName({ index, rowCount, hasTotalsRow, styles: connectorStyles })
    : '';
  return (
    <tr style={!line?.isRemoved && rowFormatColor ? { backgroundColor: rowFormatColor } : undefined}>
      {connectorCellClassName ? (
        <td className={connectorCellClassName} aria-hidden="true" />
      ) : null}
      {lineColumns.map((column) => {
        if (isColumnCollapsed(column.key, collapsedLineColumnKeys)) {
          return (
            <PurchaseOrderCollapsedColumnCell
              key={`${rowId}-${line.lineNumber ?? index}-${column.key}`}
              columnKey={column.key}
            />
          );
        }
        const changedFieldKeys = Array.isArray(line?.changedFieldKeys) ? line.changedFieldKeys : [];
        const isChangedCell = !line?.isRemoved && !line?.isNew && changedFieldKeys.includes(column.key);
        const ruleSet = columnFormatRules?.[column.key];
        const { backgroundColor: cellBackground, isConditionalFormat } = resolveLineCellBackground({
          line,
          column,
          ruleSet,
          rowFormatColor,
          isChangedCell,
        });
        const isImageColumn = isProductImageColumn(column);
        const isStatus = isStatusColumn(column);
        const baseCellStyle = getColumnCellStyle(
          columnWidths,
          columnTextStyles,
          column.key,
          cellBackground,
          { useFormattedTextColor: isConditionalFormat }
        );
        const cellStyle = isImageColumn
          ? getProductImageCellStyle(baseCellStyle, PRODUCT_IMAGE_SUB_CELL_HEIGHT)
          : {
            ...baseCellStyle,
            ...(isStatus ? { padding: 0 } : {}),
          };
        return (
          <PurchaseOrderDataCell
            key={`${rowId}-${line.lineNumber ?? index}-${column.key}`}
            cell={{ column, rawValue: line.values?.[column.key], order, trackMarks: line.trackMarksByColumnId }}
            layout={{
              className: subCellClassName,
              contentClassName: isImageColumn ? undefined : subCellContentClassName,
              contentStyle: getFormattedCellContentStyle(isConditionalFormat),
              style: cellStyle,
            }}
          >
            {renderLineCellContent({
              line,
              column,
              firstDataColumn,
              order,
              onSaveValue,
              onCorrect,
              onUpdateStatusOptions,
              isAdmin,
              styles,
              cellBackgroundColor: cellBackground,
              isConditionalFormat,
              showHistoryIndicators,
            })}
          </PurchaseOrderDataCell>
        );
      })}
    </tr>
  );
}

export default memo(PurchaseOrderSubitemLineRow);
