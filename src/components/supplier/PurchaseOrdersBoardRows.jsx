import React, { memo, useCallback, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardGroupHeader from './PurchaseOrdersBoardGroupHeader';
import PurchaseOrdersBoardOrderRows from './PurchaseOrdersBoardOrderRows';
import { normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
import { resolveOrderSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';
const useStyles = makeStyles({
  groupRowCell: {
    backgroundColor: '#f4e6ed',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0'),
  },
  groupButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('3px', '12px'),
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupCollapseButton: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    minHeight: '24px',
    ...shorthands.padding('0'),
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupDot: {
    color: '#c02f64',
    fontSize: '12px',
    lineHeight: '12px',
  },
  groupRowInner: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    width: '100%',
  },
  groupCheckbox: {
    ...shorthands.padding('0'),
    marginLeft: '6px',
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
    position: 'sticky',
    left: 0,
    zIndex: 3,
    width: '58px',
    minWidth: '58px',
    maxWidth: '58px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('1px'),
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  controlCellInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...shorthands.gap('2px'),
  },
  rowCheckbox: {
    ...shorthands.padding('0'),
  },
  rowStatusBadge: {
    marginLeft: '2px',
  },
  compactToggleButton: {
    minWidth: '22px',
    height: '22px',
    minHeight: '22px',
    ...shorthands.padding('0'),
  },
  itemCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '10px'),
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
    ...shorthands.padding('3px', '8px', '5px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
});

function PurchaseOrdersBoardRows({
  boardData,
  columnConfig,
  tableConfig,
  selection,
  cellFilterActions,
}) {
  const { groupedRows, collapsedGroups, expandedOrders } = boardData;
  const {
    columns,
    lineColumns,
    headerColumnWidths,
    lineColumnWidths,
    headerColumnTextStyles,
    headerColumnFormatRules,
    lineColumnTextStyles,
    lineColumnFormatRules,
    lineTotalColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  } = columnConfig;
  const {
    colCount,
    tableActions,
    onClearGrouping,
    cellActions,
    onSaveLineColumnWidth,
  } = tableConfig;
  const styles = useStyles();
  const effectiveHeaderColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(headerColumnFormatRules),
    [headerColumnFormatRules]
  );
  const { onToggleGroup, onToggleOrder } = tableActions;
  const orderRowsConfig = useMemo(() => ({
    styles,
    columns,
    headerColumnWidths,
    headerColumnTextStyles,
    headerColumnFormatRules: effectiveHeaderColumnFormatRules,
    onToggleOrder,
    tableConfig: {
      colCount,
      styles,
      lineColumns,
      lineColumnWidths,
      lineColumnTextStyles,
      lineColumnFormatRules,
    onSaveLineColumnWidth,
    lineTotalColumns,
    headerColumns: columns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  },
}), [
    colCount,
    columns,
    effectiveHeaderColumnFormatRules,
    headerColumnTextStyles,
    headerColumnWidths,
    lineColumnFormatRules,
    lineColumnTextStyles,
    lineColumnWidths,
    lineTotalColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
    onSaveLineColumnWidth,
    onToggleOrder,
    styles,
  ]);
  const selectionEnabled = Boolean(selection?.enabled);
  const handleGroupSelection = useCallback((keys, shouldSelect) => {
    if (!selectionEnabled || !Array.isArray(keys) || !keys.length) return;
    if (typeof selection?.setMany === 'function') {
      selection.setMany(keys, shouldSelect);
      return;
    }
    keys.forEach((key) => {
      const currentlySelected = selection?.isSelected?.(key);
      if (shouldSelect ? !currentlySelected : currentlySelected) {
        selection?.toggle?.(key);
      }
    });
  }, [selection, selectionEnabled]);

  return (
    <tbody>
      {groupedRows.map((group) => {
        const groupKey = group.groupKey || group.groupName;
        const selectionEntries = Array.isArray(group.entriesForSelection) ? group.entriesForSelection : group.entries;
        const hiddenByCollapsedAncestor = Array.isArray(group.ancestorGroupKeys) && group.ancestorGroupKeys.some((ancestorKey) => collapsedGroups[ancestorKey]);
        if (hiddenByCollapsedAncestor) return null;
        const isCollapsed = !!collapsedGroups[groupKey];
        const groupSelectionKeys = Array.from(new Set(selectionEntries.map(({ order, rowId }) => resolveOrderSelectionKey(order, rowId)).filter(Boolean)));
        const groupAllSelected = selectionEnabled && groupSelectionKeys.length > 0 && groupSelectionKeys.every((key) => selection.isSelected(key));
        const groupSomeSelected = selectionEnabled && !groupAllSelected && groupSelectionKeys.some((key) => selection.isSelected(key));
        return (
          <React.Fragment key={groupKey}>
            <PurchaseOrdersBoardGroupHeader
              colCount={colCount}
              styles={styles}
              group={group}
              selectionEntries={selectionEntries}
              groupState={{
                key: groupKey,
                selectionEnabled,
                selectionKeys: groupSelectionKeys,
                allSelected: groupAllSelected,
                someSelected: groupSomeSelected,
                isCollapsed,
              }}
              onToggleGroup={onToggleGroup}
              onGroupSelection={handleGroupSelection}
              onClearGrouping={onClearGrouping}
            />
            {!isCollapsed && group.entries.map(({ order, rowId }) => {
              const lines = Array.isArray(order.lines) ? order.lines : [];
              const selectionKey = resolveOrderSelectionKey(order, rowId);
              return (
                <PurchaseOrdersBoardOrderRows
                  key={rowId}
                  rowData={{
                    rowId,
                    order,
                    lines,
                    isExpanded: Boolean(expandedOrders[rowId]),
                    selectionKey,
                  }}
                  boardConfig={orderRowsConfig}
                  cellActions={cellActions}
                  selection={selection}
                  cellFilterActions={cellFilterActions}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </tbody>
  );
}
export default memo(PurchaseOrdersBoardRows);