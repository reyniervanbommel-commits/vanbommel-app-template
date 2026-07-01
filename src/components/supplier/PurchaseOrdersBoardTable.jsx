import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersSubitemsTable from './PurchaseOrdersSubitemsTable';
import EditableCell from './EditableCell';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

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
  controlHeaderButton: {
    minWidth: '28px',
    width: '28px',
    height: '28px',
    ...shorthands.padding('0'),
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
  removedRow: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
  },
  removedText: {
    textDecorationLine: 'line-through',
    color: tokens.colorNeutralForeground3,
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
  removedBadge: {
    marginLeft: '6px',
  },
  // Nieuw/gewijzigd sinds laatste bezoek (#133): subtiele linkerrand-markering.
  newRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteGreenBorderActive}`,
  },
  changedRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteMarigoldBorderActive}`,
  },
  rowBadge: {
    marginLeft: '6px',
  },
  subitemsContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('8px', '8px', '12px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  empty: {
    ...shorthands.padding('16px'),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

// AANNAME: De eerste header-kolom (sortOrder) toont de order-identificatie en
// krijgt naast de waarde een "verwijderd in D365"-badge wanneer removedInD365.

function PurchaseOrdersBoardTable({ items, columns, lineColumns, onSaveValue, onRenameColumn, onRemoveColumn, onCorrect, isAdmin, onToggleWriteback }) {
  const styles = useStyles();
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});
  const [headersOnly, setHeadersOnly] = useState(false);

  const rows = useMemo(
    () =>
      items.map((order, index) => ({
        order,
        rowId: order?.orderNumber
          ? `${order.dataAreaId || ''}-${order.orderNumber}-${index}`
          : 'row-' + String(index),
      })),
    [items]
  );

  // AANNAME: groepering op status-kolomwaarde (uit order.values.status indien
  // aanwezig); valt terug op 'Zonder status'.
  const groupedRows = useMemo(() => {
    const byGroup = new Map();
    rows.forEach((entry) => {
      const groupKey = entry.order.values?.status || 'Zonder status';
      if (!byGroup.has(groupKey)) {
        byGroup.set(groupKey, []);
      }
      byGroup.get(groupKey).push(entry);
    });
    return Array.from(byGroup.entries()).map(([groupName, entries]) => ({ groupName, entries }));
  }, [rows]);

  const allGroupsCollapsed = useMemo(
    () =>
      groupedRows.length > 0 &&
      groupedRows.every((group) => !!collapsedGroups[group.groupName]),
    [collapsedGroups, groupedRows]
  );
  const allOrderRowsWithLines = useMemo(() => rows
    .filter(({ order }) => Array.isArray(order.lines) && order.lines.length > 0)
    .map(({ rowId }) => rowId), [rows]);
  const allSubgroupsCollapsed = useMemo(() =>
    allOrderRowsWithLines.length > 0 && allOrderRowsWithLines.every((rowId) => !expandedOrders[rowId]), [allOrderRowsWithLines, expandedOrders]);

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
  const handleToggleAllGroups = useCallback(() => {
    setCollapsedGroups((prev) => {
      const shouldCollapseAll = !groupedRows.every((group) => !!prev[group.groupName]);
      const next = { ...prev };
      groupedRows.forEach((group) => {
        next[group.groupName] = shouldCollapseAll;
      });
      return next;
    });
  }, [groupedRows]);
  const handleToggleAllSubgroups = useCallback(() => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      const shouldExpandAll = allSubgroupsCollapsed;
      allOrderRowsWithLines.forEach((rowId) => {
        next[rowId] = shouldExpandAll;
      });
      return next;
    });
  }, [allOrderRowsWithLines, allSubgroupsCollapsed]);
  const handleToggleHeadersOnly = useCallback(() => {
    setHeadersOnly((prev) => !prev);
  }, []);

  // Rendert één header-cel: custom kolommen zijn inline bewerkbaar.
  const renderHeaderCell = useCallback((order, column, isFirst) => {
    const key = column.key;
    const rawValue = order.values?.[key];

    if (column.source === 'custom') {
      return (
        <EditableCell
          dataType={column.dataType}
          value={rawValue}
          options={column.options}
          ariaLabel={`${column.label} voor order ${order.orderNumber}`}
          cellKeys={{
            columnId: column.id,
            dataAreaId: order.dataAreaId,
            orderNumber: order.orderNumber,
            lineNumber: null,
          }}
          onSave={(value) =>
            onSaveValue({
              columnId: column.id,
              columnKey: key,
              dataAreaId: order.dataAreaId,
              orderNumber: order.orderNumber,
              lineNumber: null,
              value,
            })
          }
        />
      );
    }

    // D365-veld met write-back toegestaan (admin) → bewuste correctie-actie.
    if (column.source === 'd365' && column.writableToD365 && onCorrect) {
      return (
        <PurchaseOrderWriteBackCell
          column={column}
          value={rawValue}
          cellKeys={{
            columnId: column.id,
            dataAreaId: order.dataAreaId,
            orderNumber: order.orderNumber,
            lineNumber: null,
          }}
          onCorrect={({ value, basedOnValue }) =>
            onCorrect({
              columnId: column.id,
              columnKey: key,
              dataAreaId: order.dataAreaId,
              orderNumber: order.orderNumber,
              lineNumber: null,
              value,
              basedOnValue,
            })
          }
        />
      );
    }

    const display = formatCellValue(rawValue, column.dataType);
    if (isFirst && order.removedInD365) {
      return (
        <span>
          <span className={styles.removedText}>{display}</span>
          <Badge className={styles.removedBadge} color="danger" appearance="tint" size="small">
            verwijderd in D365
          </Badge>
        </span>
      );
    }
    if (isFirst && (order.isNew || order.isChanged)) {
      return (
        <span>
          {display}
          <Badge
            className={styles.rowBadge}
            color={order.isNew ? 'success' : 'warning'}
            appearance="tint"
            size="small"
          >
            {order.isNew ? 'nieuw' : 'gewijzigd'}
          </Badge>
        </span>
      );
    }
    return order.removedInD365 ? <span className={styles.removedText}>{display}</span> : display;
  }, [onSaveValue, onCorrect, styles.removedBadge, styles.removedText, styles.rowBadge]);

  if (!items.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }

  const colCount = columns.length + 1;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.headerCell} ${styles.controlHeaderCell}`}>
              <Button
                size="small"
                appearance="subtle"
                className={styles.controlHeaderButton}
                onClick={handleToggleAllGroups}
                title={allGroupsCollapsed ? 'Alles uitklappen' : 'Alles inklappen'}
                aria-label={allGroupsCollapsed ? 'Alles uitklappen' : 'Alles inklappen'}
              >
                {allGroupsCollapsed ? '+' : '-'}
              </Button>
              <Button
                size="small"
                appearance="subtle"
                className={styles.controlHeaderButton}
                onClick={handleToggleAllSubgroups}
                title={allSubgroupsCollapsed ? 'Alle subgroepen uitklappen' : 'Alle subgroepen inklappen'}
                aria-label={allSubgroupsCollapsed ? 'Alle subgroepen uitklappen' : 'Alle subgroepen inklappen'}
              >
                {allSubgroupsCollapsed ? '++' : '--'}
              </Button>
              <Button
                size="small"
                appearance={headersOnly ? 'primary' : 'subtle'}
                className={styles.controlHeaderButton}
                onClick={handleToggleHeadersOnly}
                title={headersOnly ? 'Normale weergave' : 'Alleen headers tonen'}
                aria-label={headersOnly ? 'Normale weergave' : 'Alleen headers tonen'}
              >
                H
              </Button>
            </th>
            {columns.map((column) => (
              <th key={column.key} className={styles.headerCell}>
                <PurchaseOrderColumnHeader
                  column={column}
                  onRename={onRenameColumn}
                  onRemove={onRemoveColumn}
                  isAdmin={isAdmin}
                  onToggleWriteback={onToggleWriteback}
                />
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
                  <td colSpan={colCount} className={styles.groupRowCell}>
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
                {!isCollapsed && !headersOnly && group.entries.map(({ order, rowId }) => {
                  const lines = Array.isArray(order.lines) ? order.lines : [];
                  const hasLines = lines.length > 0;
                  const isExpanded = !!expandedOrders[rowId];

                  return (
                    <React.Fragment key={rowId}>
                      <tr className={`${styles.itemRow} ${order.removedInD365 ? styles.removedRow : (order.isNew ? styles.newRow : (order.isChanged ? styles.changedRow : ''))}`}>
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
                        {columns.map((column, columnIndex) => (
                          <td key={`${rowId}-${column.key}`} className={styles.itemCell}>
                            {renderHeaderCell(order, column, columnIndex === 0)}
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
                              onSaveValue={onSaveValue}
                              onRenameColumn={onRenameColumn}
                              onRemoveColumn={onRemoveColumn}
                              onCorrect={onCorrect}
                              isAdmin={isAdmin}
                              onToggleWriteback={onToggleWriteback}
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
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);
