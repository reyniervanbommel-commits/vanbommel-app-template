import React, { memo } from 'react';
import { Button, Checkbox, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';
import { rowSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';

const useStyles = makeStyles({
  groupRowCell: {
    backgroundColor: '#f4e6ed',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0'),
  },
  groupButton: {
    width: '100%',
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

function getColumnCellStyle(columnWidths, columnKey) {
  const width = Number(columnWidths?.[columnKey]);
  if (!Number.isFinite(width)) return undefined;
  return { width: `${Math.round(width)}px`, minWidth: `${Math.round(width)}px` };
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
  onSaveLineColumnWidth,
  colCount,
  groupingColumnLabel,
  groupingColor,
  tableActions,
  cellActions,
  selection,
}) {
  const styles = useStyles();
  const { onToggleGroup, onToggleOrder } = tableActions;
  const selectionEnabled = Boolean(selection?.enabled);

  return (
    <tbody>
      {groupedRows.map((group) => {
        const isCollapsed = showGroupHeaders ? !!collapsedGroups[group.groupName] : false;
        return (
          <React.Fragment key={group.groupName}>
            {showGroupHeaders ? (
              <tr>
                <td colSpan={colCount} className={styles.groupRowCell} style={{ backgroundColor: groupingColor }}>
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
                </td>
              </tr>
            ) : null}
            {showBoardHeaders && !isCollapsed && group.entries.map(({ order, rowId }) => {
              const lines = Array.isArray(order.lines) ? order.lines : [];
              const hasLines = lines.length > 0;
              const isExpanded = !!expandedOrders[rowId];
              const selectionKey = rowSelectionKey(order.dataAreaId, order.orderNumber);

              return (
                <React.Fragment key={rowId}>
                  <tr className={getOrderRowClassName(order, styles)}>
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
                    {columns.map((column, columnIndex) => (
                      <td
                        key={`${rowId}-${column.key}`}
                        className={styles.itemCell}
                        style={getColumnCellStyle(headerColumnWidths, column.key)}
                      >
                        <PurchaseOrderHeaderCellContent
                          order={order}
                          column={column}
                          isFirst={columnIndex === 0}
                          onSaveValue={cellActions.onSaveValue}
                          onCorrect={cellActions.onCorrect}
                        />
                      </td>
                    ))}
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
                          onSaveColumnWidth={onSaveLineColumnWidth}
                          reorderBusy={cellActions.reorderingColumns}
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
