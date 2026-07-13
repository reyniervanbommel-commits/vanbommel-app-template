import React, { memo, useCallback } from 'react';
import PurchaseOrdersGroupHeaderRow from './PurchaseOrdersGroupHeaderRow';

function PurchaseOrdersBoardGroupHeader({
  colCount,
  styles,
  group,
  selectionEntries,
  groupState,
  onToggleGroup,
  onGroupSelection,
  onClearGrouping,
}) {
  const handleGroupSelection = useCallback((shouldSelect) => {
    onGroupSelection(groupState.selectionKeys, shouldSelect);
  }, [groupState.selectionKeys, onGroupSelection]);

  return (
    <PurchaseOrdersGroupHeaderRow
      colCount={colCount}
      styles={styles}
      groupColor={group.groupColor}
      selectionEnabled={groupState.selectionEnabled}
      groupAllSelected={groupState.allSelected}
      groupSomeSelected={groupState.someSelected}
      groupKey={groupState.key}
      groupName={group.groupName}
      groupLabel={group.groupLabel}
      groupColumnKey={group.groupColumnKey}
      groupSummaries={group.groupSummaries}
      groupLevel={group.groupLevel || 0}
      entryCount={selectionEntries.length}
      isCollapsed={groupState.isCollapsed}
      onToggleGroup={onToggleGroup}
      onToggleGroupSelection={handleGroupSelection}
      onClearGroupingColumn={onClearGrouping}
    />
  );
}

export default memo(PurchaseOrdersBoardGroupHeader);
