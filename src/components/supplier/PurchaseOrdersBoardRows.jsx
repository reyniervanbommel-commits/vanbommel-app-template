import React, { memo, useCallback, useMemo } from 'react';
import { Button, Checkbox, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules, normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { rowSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';

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
    marginLeft: '8px',
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
    ...shorthands.padding('3px', '8px', '5px', '46px'),
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
  showBoardHeaders,
  showGroupHeaders,
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
  groupingColumnLabel,
  groupingColor,
  tableActions,
  cellActions,
  lineTotalColumns,
  linkedLineTotalByHeaderKey,
  linkedLineValueByHeaderKey,
  selection,
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
        const isCollapsed = showGroupHeaders ? !!collapsedGroups[group.groupName] : false;
        const groupSelectionKeys = group.entries
          .map(({ order }) => rowSelectionKey(order.dataAreaId, order.orderNumber))
          .filter(Boolean);
        const groupAllSelected = selectionEnabled
          && groupSelectionKeys.length > 0
          && groupSelectionKeys.every((key) => selection.isSelected(key));
        const groupSomeSelected = selectionEnabled
          && !groupAllSelected
          && groupSelectionKeys.some((key) => selection.isSelected(key));
        return (
          <React.Fragment key={group.groupName}>
            {showGroupHeaders ? (
              <tr>
                <td colSpan={colCount} className={styles.groupRowCell} style={{ backgroundColor: groupingColor }}>
                  <div className={styles.groupRowInner}>
                    {selectionEnabled ? (
                      <Checkbox
                        className={styles.groupCheckbox}
                        checked={groupAllSelected ? true : (groupSomeSelected ? 'mixed' : false)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(_, data) => handleGroupSelection(groupSelectionKeys, data.checked === true)}
                        aria-label={`Select all rows in category ${group.groupName}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={styles.groupButton}
                      data-group={group.groupName}
                      onClick={onToggleGroup}
                    >
                      <span>{isCollapsed ? '+' : '-'}</span>
                      <span className={styles.groupDot}>●</span>
                      <span>{`${groupingColumnLabel}: ${group.groupName}`}</span>
                      <span>({group.entries.length})</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : null}
            {showBoardHeaders && !isCollapsed && group.entries.map(({ order, rowId }) => {
              const lines = Array.isArray(order.lines) ? order.lines : [];
              const hasLines = lines.length > 0;
              const isExpanded = !!expandedOrders[rowId];
              const selectionKey = rowSelectionKey(order.dataAreaId, order.orderNumber);
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
                    {columns.map((column, columnIndex) => {
                      const ruleSet = effectiveHeaderColumnFormatRules?.[column.key];
                      const cellFormatColor = (!order.removedInD365 && ruleSet?.target === 'cell')
                        ? evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {})
                        : '';
                      return (
                        <td
                          key={`${rowId}-${column.key}`}
                          className={styles.itemCell}
                          style={getColumnCellStyle(headerColumnWidths, headerColumnTextStyles, column.key, cellFormatColor)}
                        >
                          <PurchaseOrderHeaderCellContent
                            order={order}
                            column={column}
                            isFirst={columnIndex === 0}
                            onSaveValue={cellActions.onSaveValue}
                            onCorrect={cellActions.onCorrect}
                            linkedLineTotalMap={linkedLineTotalByHeaderKey}
                            linkedLineValueMap={linkedLineValueByHeaderKey}
                          />
                        </td>
                      );
                    })}
                  </tr>
                  {hasLines && isExpanded ? (
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
                        />
                      </td>
                    </tr>
                  ) : null}
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
