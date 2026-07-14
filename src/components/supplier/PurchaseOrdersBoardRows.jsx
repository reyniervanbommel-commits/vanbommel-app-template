import React, { memo, useCallback, useMemo } from 'react';
import { Button, Checkbox, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrderRowStatusBadge from './PurchaseOrderRowStatusBadge';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrdersBoardExpandedRow from './PurchaseOrdersBoardExpandedRow';
import PurchaseOrdersGroupHeaderRow from './PurchaseOrdersGroupHeaderRow';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules, normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { resolveOrderSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';
import { isStatusColumn, resolveStatusCellColor } from '../../utils/statusColumnUtils';
const useStyles = makeStyles({
  groupRowCell: {
    backgroundColor: '#f4e6ed',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0'),
  },
  groupButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('3px', '12px'),
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupCollapseButton: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    minHeight: '24px',
    ...shorthands.padding('0'),
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupDot: {
    color: '#c02f64',
    fontSize: '12px',
    lineHeight: '12px',
  },
  groupRowInner: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    width: '100%',
  },
  groupCheckbox: {
    ...shorthands.padding('0'),
    marginLeft: '6px',
  },
  itemRow: {
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  removedRow: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
  },
  controlCell: {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    width: '58px',
    minWidth: '58px',
    maxWidth: '58px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('1px'),
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  controlCellInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...shorthands.gap('2px'),
  },
  rowCheckbox: {
    ...shorthands.padding('0'),
  },
  rowStatusBadge: {
    marginLeft: '2px',
  },
  compactToggleButton: {
    minWidth: '22px',
    height: '22px',
    minHeight: '22px',
    ...shorthands.padding('0'),
  },
  itemCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '10px'),
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    verticalAlign: 'middle',
  },
  newRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteGreenBorderActive}`,
  },
  changedRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteMarigoldBorderActive}`,
  },
  subitemsContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('10px', '8px', '10px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
});

function getOrderRowClassName(order, styles) {
  if (order.removedInD365) return `${styles.itemRow} ${styles.removedRow}`;
  if (order.isNew) return `${styles.itemRow} ${styles.newRow}`;
  if (order.isChanged) return `${styles.itemRow} ${styles.changedRow}`;
  return styles.itemRow;
}
function resolveRowFormatColor(order, columns, headerColumnFormatRules) {
  if (order?.removedInD365) return '';
  for (const column of Array.isArray(columns) ? columns : []) {
    const ruleSet = headerColumnFormatRules[column.key];
    if (!ruleSet || ruleSet.target !== 'row') continue;
    const color = evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {});
    if (color) return color;
  }
  return '';
}
function PurchaseOrdersBoardRows({
  groupedRows,
  collapsedGroups,
  expandedOrders,
  columns,
  lineColumns,
  headerColumnWidths,
  lineColumnWidths,
  headerColumnTextStyles,
  headerColumnFormatRules,
  lineColumnTextStyles,
  lineColumnFormatRules,
  onSaveLineColumnWidth,
  colCount,
  tableActions,
  onClearGrouping,
  cellActions,
  lineTotalColumns,
  linkedLineTotalByHeaderKey,
  linkedLineValueByHeaderKey,
  selection,
  cellFilterActions,
}) {
  const styles = useStyles();
  const effectiveHeaderColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(headerColumnFormatRules),
    [headerColumnFormatRules]
  );
  const { onToggleGroup, onToggleOrder } = tableActions;
  const selectionEnabled = Boolean(selection?.enabled);
  const handleGroupSelection = useCallback((keys, shouldSelect) => {
    if (!selectionEnabled || !Array.isArray(keys) || !keys.length) return;
    if (typeof selection?.setMany === 'function') {
      selection.setMany(keys, shouldSelect);
      return;
    }
    keys.forEach((key) => {
      const currentlySelected = selection?.isSelected?.(key);
      if (shouldSelect ? !currentlySelected : currentlySelected) {
        selection?.toggle?.(key);
      }
    });
  }, [selection, selectionEnabled]);

  return (
    <tbody>
      {groupedRows.map((group) => {
        const groupKey = group.groupKey || group.groupName;
        const selectionEntries = Array.isArray(group.entriesForSelection) ? group.entriesForSelection : group.entries;
        const hiddenByCollapsedAncestor = Array.isArray(group.ancestorGroupKeys) && group.ancestorGroupKeys.some((ancestorKey) => collapsedGroups[ancestorKey]);
        if (hiddenByCollapsedAncestor) return null;
        const isCollapsed = !!collapsedGroups[groupKey];
        const groupSelectionKeys = Array.from(new Set(selectionEntries.map(({ order, rowId }) => resolveOrderSelectionKey(order, rowId)).filter(Boolean)));
        const groupAllSelected = selectionEnabled && groupSelectionKeys.length > 0 && groupSelectionKeys.every((key) => selection.isSelected(key));
        const groupSomeSelected = selectionEnabled && !groupAllSelected && groupSelectionKeys.some((key) => selection.isSelected(key));
        return (
          <React.Fragment key={groupKey}>
            <PurchaseOrdersGroupHeaderRow
              colCount={colCount}
              styles={styles}
              groupColor={group.groupColor}
              selectionEnabled={selectionEnabled}
              groupAllSelected={groupAllSelected}
              groupSomeSelected={groupSomeSelected}
              groupKey={groupKey}
              groupName={group.groupName}
              groupLabel={group.groupLabel}
              groupColumnKey={group.groupColumnKey}
              groupSummaries={group.groupSummaries}
              groupLevel={group.groupLevel || 0}
              entryCount={selectionEntries.length}
              isCollapsed={isCollapsed}
              onToggleGroup={onToggleGroup}
              onToggleGroupSelection={(shouldSelect) => handleGroupSelection(groupSelectionKeys, shouldSelect)}
              onClearGroupingColumn={onClearGrouping}
            />
            {!isCollapsed && group.entries.map(({ order, rowId }) => {
              const lines = Array.isArray(order.lines) ? order.lines : [];
              const hasLines = lines.length > 0;
              const isExpanded = !!expandedOrders[rowId];
              const selectionKey = resolveOrderSelectionKey(order, rowId);
              const rowFormatColor = resolveRowFormatColor(order, columns, effectiveHeaderColumnFormatRules);

              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={getOrderRowClassName(order, styles)}
                    style={!order.removedInD365 && rowFormatColor ? { backgroundColor: rowFormatColor } : undefined}
                  >
                    <td className={styles.controlCell}>
                      <div className={styles.controlCellInner}>
                        {selectionEnabled ? (
                          <Checkbox
                            className={styles.rowCheckbox}
                            checked={selection.isSelected(selectionKey)}
                            onChange={() => selection.toggle(selectionKey)}
                            aria-label={`Selecteer order ${order.orderNumber}`}
                          />
                        ) : null}
                        <PurchaseOrderRowStatusBadge order={order} className={styles.rowStatusBadge} />
                        {hasLines ? (
                          <Button
                            size="small"
                            appearance="subtle"
                            className={styles.compactToggleButton}
                            data-rowid={rowId}
                            onClick={onToggleOrder}
                          >
                            {isExpanded ? '-' : '+'}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                    {columns.map((column) => {
                      const ruleSet = effectiveHeaderColumnFormatRules?.[column.key];
                      const cellFormatColor = (!order.removedInD365 && ruleSet?.target === 'cell')
                        ? evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {})
                        : '';
                      const rawValue = order?.values?.[column.key];
                      const statusBackground = isStatusColumn(column) && !cellFormatColor
                        ? resolveStatusCellColor(rawValue, column.options)
                        : '';
                      const cellStyle = {
                        ...getColumnCellStyle(headerColumnWidths, headerColumnTextStyles, column.key, cellFormatColor || statusBackground),
                        ...(isStatusColumn(column) ? { padding: 0 } : {}),
                      };
                      return (
                        <PurchaseOrderDataCell
                          key={`${rowId}-${column.key}`}
                          column={column}
                          rawValue={rawValue}
                          className={styles.itemCell}
                          style={cellStyle}
                          filterByColumn={cellFilterActions?.filterByColumn}
                          onApplyFilterFromCellValue={cellFilterActions?.applyFilterFromCellValue}
                          onClearColumnFilter={cellFilterActions?.clearColumnFilter}
                          linkedLineTotalKeys={linkedLineTotalByHeaderKey}
                          linkedLineValueKeys={linkedLineValueByHeaderKey}
                        >
                          <PurchaseOrderHeaderCellContent
                            order={order}
                            column={column}
                            onSaveValue={cellActions.onSaveValue}
                            onCorrect={cellActions.onCorrect}
                            onUpdateStatusOptions={cellActions.onUpdateStatusOptions}
                            isAdmin={cellActions.isAdmin}
                            linkedLineTotalMap={linkedLineTotalByHeaderKey}
                            linkedLineValueMap={linkedLineValueByHeaderKey}
                          />
                        </PurchaseOrderDataCell>
                      );
                    })}
                  </tr>
                  <PurchaseOrdersBoardExpandedRow
                    expanded={hasLines && isExpanded}
                    rowData={{ rowId, order, lines }}
                    tableConfig={{ colCount, styles, lineColumns, lineColumnWidths, lineColumnTextStyles, lineColumnFormatRules, onSaveLineColumnWidth, lineTotalColumns, headerColumns: columns, linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey }}
                    cellActions={cellActions}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </tbody>
  );
}
export default memo(PurchaseOrdersBoardRows);