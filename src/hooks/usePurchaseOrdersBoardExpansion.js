import { useCallback, useEffect, useMemo, useState } from 'react';

export function usePurchaseOrdersBoardExpansion({ groupedRows, rows, groupingColumnKey }) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  const allOrderRowsWithLines = useMemo(
    () =>
      rows
        .filter(({ order }) => Array.isArray(order.lines) && order.lines.length > 0)
        .map(({ rowId }) => rowId),
    [rows]
  );

  useEffect(() => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      rows.forEach(({ rowId }) => {
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

  useEffect(() => {
    setCollapsedGroups({});
  }, [groupingColumnKey]);

  const handleToggleGroup = useCallback((event) => {
    const groupKey = event.currentTarget.dataset.groupKey || event.currentTarget.dataset.group || '';
    if (!groupKey) return;
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleToggleOrder = useCallback((event) => {
    const rowId = event.currentTarget.dataset.rowid || '';
    if (!rowId) return;
    setExpandedOrders((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  const handleSetAllBoardsExpanded = useCallback((shouldExpand) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      groupedRows.forEach((group) => {
        const groupKey = group.groupKey || group.groupName;
        if (!groupKey) return;
        next[groupKey] = !shouldExpand;
      });
      return next;
    });
  }, [groupedRows]);

  const handleSetAllGroupsExpanded = useCallback((shouldExpand) => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      allOrderRowsWithLines.forEach((rowId) => {
        next[rowId] = shouldExpand;
      });
      return next;
    });
  }, [allOrderRowsWithLines]);

  const handleSetExpansion = useCallback((scope, shouldExpand) => {
    if (scope === 'all' || scope === 'boards') {
      handleSetAllBoardsExpanded(shouldExpand);
    }
    if (scope === 'all' || scope === 'groups') {
      handleSetAllGroupsExpanded(shouldExpand);
    }
  }, [handleSetAllBoardsExpanded, handleSetAllGroupsExpanded]);

  const tableActions = useMemo(
    () => ({
      onToggleGroup: handleToggleGroup,
      onToggleOrder: handleToggleOrder,
    }),
    [handleToggleGroup, handleToggleOrder]
  );

  return {
    collapsedGroups,
    expandedOrders,
    handleSetExpansion,
    tableActions,
  };
}
