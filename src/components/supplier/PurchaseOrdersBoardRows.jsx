import React, { memo } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';

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
    ...shorthands.padding('6px', '12px'),
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
    ...shorthands.padding('2px'),
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  itemCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('5px', '10px'),
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
    ...shorthands.padding('6px', '8px', '8px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
});

function getOrderRowClassName(order, styles) {
  if (order.removedInD365) return `${styles.itemRow} ${styles.removedRow}`;
  if (order.isNew) return `${styles.itemRow} ${styles.newRow}`;
  if (order.isChanged) return `${styles.itemRow} ${styles.changedRow}`;
  return styles.itemRow;
}

function PurchaseOrdersBoardRows({
  groupedRows,
  collapsedGroups,
  expandedOrders,
  headersOnly,
  columns,
  lineColumns,
  colCount,
  tableActions,
  cellActions,
}) {
  const styles = useStyles();
  const { onToggleGroup, onToggleOrder } = tableActions;

  return (
    <tbody>
      {groupedRows.map((group) => {
        const isCollapsed = !!collapsedGroups[group.groupName];
        return (
          <React.Fragment key={group.groupName}>
            <tr>
              <td colSpan={colCount} className={styles.groupRowCell}>
                <button
                  type="button"
                  className={styles.groupButton}
                  data-group={group.groupName}
                  onClick={onToggleGroup}
                >
                  <span>{isCollapsed ? '+' : '-'}</span>
                  <span className={styles.groupDot}>●</span>
                  <span>{group.groupName}</span>
                  <span>({group.entries.length})</span>
                </button>
              </td>
            </tr>
            {!isCollapsed && !headersOnly && group.entries.map(({ order, rowId }) => {
              const lines = Array.isArray(order.lines) ? order.lines : [];
              const hasLines = lines.length > 0;
              const isExpanded = !!expandedOrders[rowId];

              return (
                <React.Fragment key={rowId}>
                  <tr className={getOrderRowClassName(order, styles)}>
                    <td className={styles.controlCell}>
                      {hasLines ? (
                        <Button
                          size="small"
                          appearance="subtle"
                          data-rowid={rowId}
                          onClick={onToggleOrder}
                        >
                          {isExpanded ? '-' : '+'}
                        </Button>
                      ) : null}
                    </td>
                    {columns.map((column, columnIndex) => (
                      <td key={`${rowId}-${column.key}`} className={styles.itemCell}>
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
