import { useMemo } from 'react';
import { usePoColumnHeaderHover } from '../../hooks/usePoColumnHeaderHover';
import { buildPoHeaderHoverModel } from './poHeaderHoverModel';

/**
 * Header-row hover: delayed overlay with the active column filter only.
 *
 * @returns {{
 *   hover: { columnKey: string, top: number, left: number } | null,
 *   model: { text: string } | null,
 *   onMouseOver: Function,
 *   onMouseOut: Function,
 *   onMouseDown: Function,
 * }}
 */
export function usePoBoardHeaderHover({
  columns = [],
  filterByColumn = {},
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
      datePeriodDisplayMode: datePeriodDisplayModes[hoveredColumn.key],
    });
  }, [datePeriodDisplayModes, filterByColumn, hoveredColumn]);

  return {
    hover: headerHover.hover,
    model,
    onMouseOver: headerHover.onMouseOver,
    onMouseOut: headerHover.onMouseOut,
    onMouseDown: headerHover.onMouseDown,
  };
}
