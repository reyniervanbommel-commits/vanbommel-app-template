import React, { memo, useCallback, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderBoardRow from './PurchaseOrderBoardRow';
import PurchaseOrdersGroupHeaderRow from './PurchaseOrdersGroupHeaderRow';
import { normalizeColumnFormatRulesMap } from './columnFormatRuleUtils';
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
    width: '104px',
    minWidth: '104px',
    maxWidth: '104px',
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

const PurchaseOrdersBoardGroup = memo(function PurchaseOrdersBoardGroup({
  group,
  collapsedGroups,
  rowLayout,
  formatting,
  actions,
  links,
  selection,
  contextMenu,
  remarks,
}) {
  const groupKey = group.groupKey || group.groupName;
  const hidden = group.ancestorGroupKeys?.some((key) => collapsedGroups[key]);
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

  if (hidden) return null;

  return (
    <React.Fragment>
      <PurchaseOrdersGroupHeaderRow
        group={groupData}
        layout={groupLayout}
        selection={selection}
        actions={actions.group}
      />
      {!isCollapsed ? group.entries.map((entry) => (
        <PurchaseOrderBoardRow
          key={entry.rowId}
          entry={entry}
          layout={rowLayout}
          formatting={formatting}
          actions={actions.row}
          links={links}
          selection={selection}
          contextMenu={contextMenu}
          remarks={remarks}
        />
      )) : null}
    </React.Fragment>
  );
});

function PurchaseOrdersBoardRows({
  data,
  layout,
  formatting,
  actions,
  links,
  selection,
  contextMenu,
  remarks,
}) {
  const styles = useStyles();
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
    expandedOrders: data.expandedOrders,
  }), [data.expandedOrders, layout, styles]);
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
    },
  }), [actions, handleGroupSelection]);

  return (
    <tbody>
      {data.groupedRows.map((group) => (
        <PurchaseOrdersBoardGroup
          key={group.groupKey || group.groupName}
          group={group}
          collapsedGroups={data.collapsedGroups}
          rowLayout={rowLayout}
          formatting={effectiveFormatting}
          actions={stableActions}
          links={links}
          selection={selection}
          contextMenu={contextMenu}
          remarks={remarks}
        />
      ))}
    </tbody>
  );
}
export default memo(PurchaseOrdersBoardRows);