import React, { memo, useCallback, useMemo } from 'react';
import PurchaseOrderBoardRow from './PurchaseOrderBoardRow';
import PurchaseOrdersGroupHeaderRow from './PurchaseOrdersGroupHeaderRow';
import { normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX } from './purchaseOrderBoardLayout';
import { usePurchaseOrdersBoardRowsStyles } from './purchaseOrdersBoardRowsStyles';
import { useBoardRowWindow } from '../../hooks/useBoardRowWindow';
import { buildBoardRowSlots } from '../../utils/purchaseOrderBoardRowSlots';
import { orderLocateKeyFromOrder } from '../../utils/purchaseOrderRowLocate';

const PurchaseOrdersBoardGroupHeader = memo(function PurchaseOrdersBoardGroupHeader({
  group,
  collapsedGroups,
  rowLayout,
  selection,
  groupActions,
}) {
  const groupKey = group.groupKey || group.groupName;
  const isCollapsed = Boolean(collapsedGroups[groupKey]);
  const selectionEntries = Array.isArray(group.entriesForSelection)
    ? group.entriesForSelection
    : group.entries;
  const groupData = useMemo(
    () => ({ ...group, groupKey, selectionEntries }),
    [group, groupKey, selectionEntries]
  );
  const groupLayout = useMemo(
    () => ({
      colCount: rowLayout.colCount,
      styles: rowLayout.styles,
      isCollapsed,
    }),
    [isCollapsed, rowLayout]
  );
  return (
    <PurchaseOrdersGroupHeaderRow
      group={groupData}
      layout={groupLayout}
      selection={selection}
      actions={groupActions}
    />
  );
});

function SpacerRow({ heightPx, colCount }) {
  if (!heightPx) return null;
  return (
    <tr aria-hidden="true">
      <td colSpan={colCount} style={{ height: heightPx, padding: 0, border: 0 }} />
    </tr>
  );
}

function PurchaseOrdersBoardRows({
  data,
  layout,
  formatting,
  actions,
  links,
  selection,
  contextMenu,
  remarks,
  scrollRef = null,
}) {
  const styles = usePurchaseOrdersBoardRowsStyles();
  const effectiveHeaderColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(formatting.headerColumnFormatRules),
    [formatting.headerColumnFormatRules]
  );
  const effectiveFormatting = useMemo(
    () => ({ ...formatting, headerColumnFormatRules: effectiveHeaderColumnFormatRules }),
    [effectiveHeaderColumnFormatRules, formatting]
  );
  const selectionEnabled = Boolean(selection?.enabled);
  const handleGroupSelection = useCallback((selectionKeys, shouldSelect) => {
    if (!selectionEnabled || !selectionKeys.length) return;
    if (typeof selection?.setMany === 'function') {
      selection.setMany(selectionKeys, shouldSelect);
      return;
    }
    selectionKeys.forEach((key) => {
      const currentlySelected = selection?.isSelected?.(key);
      if (shouldSelect ? !currentlySelected : currentlySelected) {
        selection?.toggle?.(key);
      }
    });
  }, [selection, selectionEnabled]);

  const rowLayout = useMemo(() => ({
    ...layout,
    styles,
  }), [layout, styles]);
  const stableActions = useMemo(() => ({
    group: {
      onToggleGroup: actions.tableActions.onToggleGroup,
      onToggleGroupSelection: handleGroupSelection,
      onClearGroupingColumn: actions.onClearGrouping,
    },
    row: {
      onToggleOrder: actions.tableActions.onToggleOrder,
      onSaveLineColumnWidth: actions.onSaveLineColumnWidth,
      cellActions: actions.cellActions,
      onToggleLineColumnCollapsed: actions.onToggleLineColumnCollapsed,
    },
  }), [actions, handleGroupSelection]);

  const slots = useMemo(
    () => buildBoardRowSlots(data.groupedRows, data.collapsedGroups),
    [data.collapsedGroups, data.groupedRows]
  );
  const hasExpanded = useMemo(
    () => Object.values(data.expandedOrders || {}).some(Boolean),
    [data.expandedOrders]
  );
  // Locate + expand need real DOM nodes / variable heights — disable window then.
  const windowEnabled = !data.locateActive && !hasExpanded;
  const { start, end, topPadPx, bottomPadPx } = useBoardRowWindow({
    scrollRef,
    totalCount: slots.length,
    rowHeightPx: PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX,
    overscan: 14,
    enabled: windowEnabled,
  });
  const visibleSlots = useMemo(() => slots.slice(start, end), [end, slots, start]);
  const colCount = Math.max(1, (layout.colCount || 1) + 1);

  return (
    <tbody>
      <SpacerRow heightPx={topPadPx} colCount={colCount} />
      {visibleSlots.map((slot) => {
        if (slot.type === 'group') {
          return (
            <PurchaseOrdersBoardGroupHeader
              key={`g-${slot.groupKey}`}
              group={slot.group}
              collapsedGroups={data.collapsedGroups}
              rowLayout={rowLayout}
              selection={selection}
              groupActions={stableActions.group}
            />
          );
        }
        return (
          <PurchaseOrderBoardRow
            key={slot.entry.rowId}
            entry={slot.entry}
            layout={rowLayout}
            isExpanded={Boolean(data.expandedOrders[slot.entry.rowId])}
            isLocated={data.highlightedLocateKey === orderLocateKeyFromOrder(slot.entry.order)}
            formatting={effectiveFormatting}
            actions={stableActions.row}
            links={links}
            selection={selection}
            contextMenu={contextMenu}
            remarks={remarks}
          />
        );
      })}
      <SpacerRow heightPx={bottomPadPx} colCount={colCount} />
    </tbody>
  );
}
export default memo(PurchaseOrdersBoardRows);
