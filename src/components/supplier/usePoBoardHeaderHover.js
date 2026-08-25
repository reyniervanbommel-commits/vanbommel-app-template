import { useMemo } from 'react';
import { usePoColumnHeaderHover } from '../../hooks/usePoColumnHeaderHover';
import { buildPoHeaderHoverModel, getPoHeaderConnectionTargets } from './poHeaderHoverModel';

/**
 * Header-row hover: delayed overlay state plus in-memory card model.
 *
 * @returns {{
 *   hover: { columnKey: string, top: number, left: number } | null,
 *   model: { title: string, rows: { label: string, value: string }[] } | null,
 *   onMouseOver: Function,
 *   onMouseOut: Function,
 *   onMouseDown: Function,
 * }}
 */
export function usePoBoardHeaderHover({
  columns = [],
  filterByColumn = {},
  sortState,
  groupingColumnKey,
  groupSummaryColumnKeys = [],
  headerColumnFormatRules = {},
  linkedLineTotalByHeaderKey = {},
  linkedLineValueByHeaderKey = {},
  lineColumns = [],
  datePeriodDisplayModes = {},
  disabled = false,
}) {
  const headerHover = usePoColumnHeaderHover({ disabled });
  const hoveredColumn = useMemo(
    () => (headerHover.hover
      ? columns.find((column) => column.key === headerHover.hover.columnKey)
      : null),
    [columns, headerHover.hover],
  );
  const model = useMemo(() => {
    if (!hoveredColumn) return null;
    return buildPoHeaderHoverModel({
      column: hoveredColumn,
      filter: filterByColumn[hoveredColumn.key],
      sortState,
      groupingColumnKey,
      isGroupSummaryColumn: groupSummaryColumnKeys.includes(hoveredColumn.key),
      formatRuleSet: headerColumnFormatRules[hoveredColumn.key],
      connectionTargets: getPoHeaderConnectionTargets({
        columnKey: hoveredColumn.key,
        linkedLineTotalByHeaderKey,
        linkedLineValueByHeaderKey,
        lineColumns,
      }),
      datePeriodDisplayMode: datePeriodDisplayModes[hoveredColumn.key],
      isSticky: Number.isFinite(Number(hoveredColumn?.stickyLeft)),
      isConnected: Boolean(linkedLineValueByHeaderKey[hoveredColumn.key]),
    });
  }, [
    datePeriodDisplayModes,
    filterByColumn,
    groupingColumnKey,
    groupSummaryColumnKeys,
    headerColumnFormatRules,
    hoveredColumn,
    lineColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
    sortState,
  ]);

  return {
    hover: headerHover.hover,
    model,
    onMouseOver: headerHover.onMouseOver,
    onMouseOut: headerHover.onMouseOut,
    onMouseDown: headerHover.onMouseDown,
  };
}
