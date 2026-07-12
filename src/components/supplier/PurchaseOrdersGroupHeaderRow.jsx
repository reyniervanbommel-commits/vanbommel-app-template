import React, { memo } from 'react';
import { Checkbox } from '@fluentui/react-components';

function PurchaseOrdersGroupHeaderRow({
  colCount,
  styles,
  groupingColor,
  selectionEnabled,
  groupAllSelected,
  groupSomeSelected,
  groupName,
  groupingColumnLabel,
  entryCount,
  isCollapsed,
  onToggleGroup,
  onToggleGroupSelection,
}) {
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
      <td colSpan={colCount} className={styles.groupRowCell} style={{ backgroundColor: groupingColor }}>
        <div className={styles.groupRowInner}>
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
            data-group={groupName}
            onClick={onToggleGroup}
            aria-label={isCollapsed ? `Expand category ${groupName}` : `Collapse category ${groupName}`}
          >
            {isCollapsed ? '+' : '-'}
          </button>
          <button
            type="button"
            className={styles.groupButton}
            data-group={groupName}
            onClick={handleGroupLabelClick}
            aria-label={`Select rows in category ${groupName}`}
          >
            <span className={styles.groupDot}>●</span>
            <span>{`${groupingColumnLabel}: ${groupName}`}</span>
            <span>({entryCount})</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(PurchaseOrdersGroupHeaderRow);
