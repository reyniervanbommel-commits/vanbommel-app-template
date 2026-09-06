import { useCallback, useMemo, useRef, useState } from 'react';
import {
  firstChartDataAreaId,
  isSameRccpHover,
} from '../components/rccp/RccpPoSegmentTooltip';

/**
 * Tracks the hovered PO segment on the chart (for the floating hover card) and resolves the
 * item that should stay highlighted — either the hovered segment's item or the item selected
 * via `itemFocus`.
 *
 * @param {{ chart: Array, itemFocus?: { item?: string, onSelect?: Function } }} input
 * @returns {{
 *   hoveredSegment: object|null, hoverBoxRef: React.RefObject,
 *   hoverValue: { onHover: Function, onClick: Function, highlightItem: string },
 *   highlightItem: string, fallbackDataAreaId: string,
 * }}
 */
export function useRccpChartHoverSegment({ chart, itemFocus = null }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const hoverBoxRef = useRef(null);
  const fallbackDataAreaId = useMemo(() => firstChartDataAreaId(chart), [chart]);

  const handleSegmentHover = useCallback((next) => {
    if (!next) {
      setHoveredSegment(null);
      return;
    }
    if (hoverBoxRef.current) {
      hoverBoxRef.current.style.left = `${next.x + 12}px`;
      hoverBoxRef.current.style.top = `${next.y + 12}px`;
    }
    setHoveredSegment((prev) => (isSameRccpHover(prev, next) ? prev : next));
  }, []);
  const handleSegmentClick = useCallback((itemNumber) => {
    itemFocus?.onSelect?.(itemNumber);
  }, [itemFocus]);

  const hoverHighlight = (
    hoveredSegment?.segment?.status === 'received'
    || hoveredSegment?.segment?.status === 'ordered'
  )
    ? (hoveredSegment.segment.itemNumber || '')
    : '';
  const highlightItem = hoverHighlight || itemFocus?.item || '';

  const hoverValue = useMemo(() => ({
    onHover: handleSegmentHover,
    onClick: handleSegmentClick,
    highlightItem,
  }), [handleSegmentHover, handleSegmentClick, highlightItem]);

  return { hoveredSegment, hoverBoxRef, hoverValue, highlightItem, fallbackDataAreaId };
}
