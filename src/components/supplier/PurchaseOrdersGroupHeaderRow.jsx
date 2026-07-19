import React, { memo, useCallback, useMemo } from 'react';
import { Checkbox } from '@fluentui/react-components';
import { resolveOrderSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';

function PurchaseOrdersGroupHeaderRow({
  group,
  layout,
  selection,
  actions,
}) {
  const {
    groupKey,
    groupName,
    groupLabel,
    groupColumnKey,
    groupSummaries = [],
    groupLevel = 0,
    groupColor,
    selectionEntries,
  } = group;
  const { colCount, styles, isCollapsed } = layout;
  const selectionEnabled = Boolean(selection?.enabled);
  const selectionKeys = useMemo(
    () => Array.from(new Set(selectionEntries
      .map(({ order, rowId }) => resolveOrderSelectionKey(order, rowId))
      .filter(Boolean))),
    [selectionEntries]
  );
  const groupAllSelected = selectionEnabled
    && selectionKeys.length > 0
    && selectionKeys.every((key) => selection.isSelected(key));
  const groupSomeSelected = selectionEnabled
    && !groupAllSelected
    && selectionKeys.some((key) => selection.isSelected(key));
  const cellStyle = useMemo(() => ({ backgroundColor: groupColor }), [groupColor]);
  const innerStyle = useMemo(() => ({
    position: 'sticky',
    left: 0,
    zIndex: 1,
    width: 'fit-content',
    backgroundColor: groupColor,
  }), [groupColor]);
  const labelStyle = useMemo(
    () => ({ paddingLeft: `${12 + (groupLevel * 14)}px` }),
    [groupLevel]
  );

  const handleToggleGroupSelection = useCallback((_, data) => {
    actions.onToggleGroupSelection(selectionKeys, data.checked === true);
  }, [actions, selectionKeys]);

  const handleGroupLabelClick = useCallback((event) => {
    if (selectionEnabled) {
      actions.onToggleGroupSelection(selectionKeys, !groupAllSelected);
      return;
    }
    actions.onToggleGroup(event);
  }, [actions, groupAllSelected, selectionEnabled, selectionKeys]);

  const handleClearGrouping = useCallback(() => {
    actions.onClearGroupingColumn(groupColumnKey);
  }, [actions, groupColumnKey]);

  const handleCheckboxClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  if (!groupName && !groupLabel) return null;

  return (
    <tr>
      <td colSpan={colCount} className={styles.groupRowCell} style={cellStyle}>
        <div className={styles.groupRowInner} style={innerStyle}>
          {selectionEnabled ? (
            <Checkbox
              className={styles.groupCheckbox}
              checked={groupAllSelected ? true : (groupSomeSelected ? 'mixed' : false)}
              onClick={handleCheckboxClick}
              onChange={handleToggleGroupSelection}
              aria-label={`Select all rows in group ${groupName}`}
            />
          ) : null}
          <button
            type="button"
            className={styles.groupCollapseButton}
            data-group-key={groupKey}
            onClick={actions.onToggleGroup}
            aria-label={isCollapsed ? `Expand group ${groupName}` : `Collapse group ${groupName}`}
          >
            {isCollapsed ? '+' : '-'}
          </button>
          {groupColumnKey ? (
            <button
              type="button"
              className={styles.groupCollapseButton}
              onClick={handleClearGrouping}
              aria-label={`Remove grouping for ${groupLabel}`}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className={styles.groupButton}
            data-group-key={groupKey}
            onClick={handleGroupLabelClick}
            aria-label={`Select rows in group ${groupName}`}
            style={labelStyle}
          >
            <span className={styles.groupDot}>●</span>
            <span>{`${groupLabel}: ${groupName}`}</span>
            <span>({selectionEntries.length})</span>
            {groupSummaries.map((summary) => (
              <span key={summary.columnKey}>{`${summary.label}: ${summary.displayValue}`}</span>
            ))}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(PurchaseOrdersGroupHeaderRow);
