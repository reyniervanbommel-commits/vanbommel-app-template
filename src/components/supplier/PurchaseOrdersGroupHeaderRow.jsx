import React, { memo } from 'react';
import { Checkbox } from '@fluentui/react-components';

function PurchaseOrdersGroupHeaderRow({
  colCount,
  styles,
  groupColor,
  selectionEnabled,
  groupAllSelected,
  groupSomeSelected,
  groupKey,
  groupName,
  groupLabel,
  groupColumnKey,
  groupSummaries = [],
  groupLevel = 0,
  entryCount,
  isCollapsed,
  onToggleGroup,
  onToggleGroupSelection,
  onClearGroupingColumn,
}) {
  if (!groupName && !groupLabel) return null;

  const handleToggleGroupSelection = (_, data) => {
    onToggleGroupSelection(data.checked === true);
  };

  const handleGroupLabelClick = (event) => {
    if (selectionEnabled) {
      onToggleGroupSelection(!groupAllSelected);
      return;
    }
    onToggleGroup(event);
  };

  return (
    <tr>
      <td colSpan={colCount} className={styles.groupRowCell} style={{ backgroundColor: groupColor }}>
        <div
          className={styles.groupRowInner}
          style={{ position: 'sticky', left: 0, zIndex: 5, width: 'fit-content', backgroundColor: groupColor }}
        >
          {selectionEnabled ? (
            <Checkbox
              className={styles.groupCheckbox}
              checked={groupAllSelected ? true : (groupSomeSelected ? 'mixed' : false)}
              onClick={(event) => event.stopPropagation()}
              onChange={handleToggleGroupSelection}
              aria-label={`Select all rows in category ${groupName}`}
            />
          ) : null}
          <button
            type="button"
            className={styles.groupCollapseButton}
            data-group-key={groupKey}
            onClick={onToggleGroup}
            aria-label={isCollapsed ? `Expand category ${groupName}` : `Collapse category ${groupName}`}
          >
            {isCollapsed ? '+' : '-'}
          </button>
          {groupColumnKey ? (
            <button
              type="button"
              className={styles.groupCollapseButton}
              onClick={() => onClearGroupingColumn(groupColumnKey)}
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
            aria-label={`Select rows in category ${groupName}`}
            style={{ paddingLeft: `${12 + (groupLevel * 14)}px` }}
          >
            <span className={styles.groupDot}>●</span>
            <span>{`${groupLabel}: ${groupName}`}</span>
            <span>({entryCount})</span>
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
