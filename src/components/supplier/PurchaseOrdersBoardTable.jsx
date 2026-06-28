import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '980px',
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '12px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  controlHeaderCell: {
    width: '44px',
    textAlign: 'center',
  },
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
    ...shorthands.padding('8px', '12px'),
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
  controlCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('4px'),
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  itemCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('8px', '10px'),
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  subitemsContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('8px', '8px', '12px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  subHeaderCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  empty: {
    ...shorthands.padding('16px'),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

function getRowId(order, index) {
  if (order?.id) return String(order.id);
  if (order?.orderNumber) return String(order.orderNumber) + '-' + String(index);
  return 'row-' + String(index);
}

function toDisplay(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '-';
}

function PurchaseOrdersBoardTable({ items, columns }) {
  const styles = useStyles();
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  const rows = useMemo(
    () => items.map((order, index) => ({ order, rowId: getRowId(order, index) })),
    [items]
  );

  const groupedRows = useMemo(() => {
    const byGroup = new Map();
    rows.forEach((entry) => {
      const groupKey = entry.order.status || 'Zonder status';
      if (!byGroup.has(groupKey)) {
        byGroup.set(groupKey, []);
      }
      byGroup.get(groupKey).push(entry);
    });
    return Array.from(byGroup.entries()).map(([groupName, entries]) => ({ groupName, entries }));
  }, [rows]);

  useEffect(() => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      rows.forEach(({ rowId, order }) => {
        if (typeof next[rowId] === 'undefined') {
          next[rowId] = Array.isArray(order.lines) && order.lines.length > 0;
        }
      });
      Object.keys(next).forEach((rowId) => {
        if (!rows.some((row) => row.rowId === rowId)) delete next[rowId];
      });
      return next;
    });
  }, [rows]);

  const handleToggleGroup = useCallback((event) => {
    const groupName = event.currentTarget.dataset.group || '';
    if (!groupName) return;
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  const handleToggleOrder = useCallback((event) => {
    const rowId = event.currentTarget.dataset.rowid || '';
    if (!rowId) return;
    setExpandedOrders((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  if (!items.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.headerCell} ${styles.controlHeaderCell}`} />
            {columns.map((column) => (
              <th key={column.key} className={styles.headerCell}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group) => {
            const isCollapsed = !!collapsedGroups[group.groupName];
            return (
              <React.Fragment key={group.groupName}>
                <tr>
                  <td colSpan={columns.length + 1} className={styles.groupRowCell}>
                    <button
                      type="button"
                      className={styles.groupButton}
                      data-group={group.groupName}
                      onClick={handleToggleGroup}
                    >
                      <span>{isCollapsed ? '+' : '-'}</span>
                      <span className={styles.groupDot}>●</span>
                      <span>{group.groupName}</span>
                      <span>({group.entries.length})</span>
                    </button>
                  </td>
                </tr>
                {!isCollapsed && group.entries.map(({ order, rowId }) => {
                  const lines = Array.isArray(order.lines) ? order.lines : [];
                  const hasLines = lines.length > 0;
                  const isExpanded = !!expandedOrders[rowId];

                  return (
                    <React.Fragment key={rowId}>
                      <tr className={styles.itemRow}>
                        <td className={styles.controlCell}>
                          {hasLines ? (
                            <Button
                              size="small"
                              appearance="subtle"
                              data-rowid={rowId}
                              onClick={handleToggleOrder}
                            >
                              {isExpanded ? '-' : '+'}
                            </Button>
                          ) : null}
                        </td>
                        {columns.map((column) => {
                          const value = column.render ? column.render(order) : order[column.key];
                          return (
                            <td key={`${rowId}-${column.key}`} className={styles.itemCell}>
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                      {hasLines && isExpanded ? (
                        <tr>
                          <td colSpan={columns.length + 1} className={styles.subitemsContainer}>
                            <table className={styles.subTable}>
                              <thead>
                                <tr>
                                  <th className={styles.subHeaderCell}>Subitem-ID</th>
                                  <th className={styles.subHeaderCell}>Subitemnaam</th>
                                  <th className={styles.subHeaderCell}>What To Test</th>
                                  <th className={styles.subHeaderCell}>Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lines.map((line, index) => (
                                  <tr key={`${rowId}-line-${line.lineNumber || index}`}>
                                    <td className={styles.subCell}>
                                      {toDisplay(line.purchaseOrderNumber)}-{toDisplay(line.lineNumber)}
                                    </td>
                                    <td className={styles.subCell}>{toDisplay(line.itemNumber)}</td>
                                    <td className={styles.subCell}>{toDisplay(line.description)}</td>
                                    <td className={styles.subCell}>
                                      {toDisplay(line.quantity)} {toDisplay(line.unit)} | {toDisplay(line.lineAmount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);

