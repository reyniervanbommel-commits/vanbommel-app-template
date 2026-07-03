import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';
import PurchaseOrderTableFilterRow from './PurchaseOrderTableFilterRow';
import { usePurchaseOrderTableView } from '../../hooks/usePurchaseOrderTableView';

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    height: '100%',
    minHeight: 0,
    overflow: 'auto',
    overflowX: 'scroll',
    scrollbarGutter: 'stable',
  },
  table: {
    width: 'max-content',
    borderCollapse: 'collapse',
    minWidth: '100%',
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '12px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
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
  const {
    processedItems,
    sortState,
    filterByColumn,
    activeFilterCount,
    hasActiveSort,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    clearAllFilters,
    toggleSort,
    clearSort,
  } = usePurchaseOrderTableView({ items, columns });

  const rows = useMemo(
    () =>
      processedItems.map((order, index) => ({
        order,
        rowId: order?.orderNumber
          ? `${order.dataAreaId || ''}-${order.orderNumber}-${index}`
          : 'row-' + String(index),
      })),
    [processedItems]
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

  const allOrderRowsWithLines = useMemo(
    () =>
      rows
        .filter(({ order }) => Array.isArray(order.lines) && order.lines.length > 0)
        .map(({ rowId }) => rowId),
    [rows]
  );

  const allSubgroupsCollapsed = useMemo(
    () =>
      allOrderRowsWithLines.length > 0 &&
      allOrderRowsWithLines.every((rowId) => !expandedOrders[rowId]),
    [allOrderRowsWithLines, expandedOrders]
  );

  useEffect(() => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      rows.forEach(({ rowId, order }) => {
        if (typeof next[rowId] === 'undefined') {
          next[rowId] = false;
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

  const tableActions = useMemo(
    () => ({
      onToggleGroup: handleToggleGroup,
      onToggleOrder: handleToggleOrder,
    }),
    [handleToggleGroup, handleToggleOrder]
  );

  const cellActions = useMemo(
    () => ({
      onSaveValue,
      onRenameColumn,
      onRemoveColumn,
      onCorrect,
      isAdmin,
      onToggleWriteback,
    }),
    [onSaveValue, onRenameColumn, onRemoveColumn, onCorrect, isAdmin, onToggleWriteback]
  );

  if (!items.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }
  if (!processedItems.length) {
    return <div className={styles.empty}>No rows match the active filters</div>;
  }

  const colCount = columns.length + 1;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <PurchaseOrdersTableControls
              allGroupsCollapsed={allGroupsCollapsed}
              allSubgroupsCollapsed={allSubgroupsCollapsed}
              headersOnly={headersOnly}
              onToggleAllGroups={handleToggleAllGroups}
              onToggleAllSubgroups={handleToggleAllSubgroups}
              onToggleHeadersOnly={handleToggleHeadersOnly}
            />
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
          <PurchaseOrderTableFilterRow
            columns={columns}
            filterByColumn={filterByColumn}
            sortState={sortState}
            activeFilterCount={activeFilterCount}
            hasActiveSort={hasActiveSort}
            onToggleSort={toggleSort}
            onSetOperator={setFilterOperator}
            onSetValue={setFilterValue}
            onSetSecondaryValue={setFilterSecondaryValue}
            onClearFilter={clearColumnFilter}
            onClearAllFilters={clearAllFilters}
            onClearSort={clearSort}
          />
        </thead>
        <PurchaseOrdersBoardRows
          groupedRows={groupedRows}
          collapsedGroups={collapsedGroups}
          expandedOrders={expandedOrders}
          headersOnly={headersOnly}
          columns={columns}
          lineColumns={lineColumns}
          colCount={colCount}
          tableActions={tableActions}
          cellActions={cellActions}
        />
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);
