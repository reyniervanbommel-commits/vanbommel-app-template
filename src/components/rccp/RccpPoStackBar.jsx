import React, { createContext, memo, useCallback, useContext } from 'react';
import { isReceivedPairHighlight, stackRectLayout, weekBarBox } from './rccpPoStack';

const LATE_STROKE = '#D13438';
const PAIR_STROKE = '#323130';
const ORDERED_ABOVE_OPACITY = 0.45;
const ORDERED_ABOVE_HIGHLIGHT_OPACITY = 0.9;

export const RccpSegmentHoverContext = createContext(null);

function segmentFillOpacity(status, highlighted) {
  if (status === 'ordered') {
    return highlighted ? ORDERED_ABOVE_HIGHLIGHT_OPACITY : ORDERED_ABOVE_OPACITY;
  }
  return 1;
}

function RccpPoStackBar({
  y, height, payload, side, index,
}) {
  const hover = useContext(RccpSegmentHoverContext);
  const highlightItem = hover?.highlightItem || '';
  const segments = side === 'above'
    ? (payload?.segmentsAbove || [])
    : (payload?.segmentsBelow || []);
  const layout = stackRectLayout(segments, y, height, side);
  const barWidth = side === 'above'
    ? Number(payload?.__barWidthAbove)
    : Number(payload?.__barWidthBelow);
  const box = weekBarBox(index, barWidth);
  if (!box.width || !layout.length) return null;
  return (
    <g>
      {layout.map(({ y: rectY, height: rectH, segment }, segIndex) => (
        <RccpPoSegmentRect
          key={`${segment.itemNumber}-${segment.status}-${segIndex}`}
          x={box.x}
          y={rectY}
          width={box.width}
          height={rectH}
          segment={segment}
          weekLabel={payload?.key}
          fill={segment.status === 'received' ? payload.__receivedColor : payload.__openColor}
          highlighted={isReceivedPairHighlight(segment, highlightItem)}
        />
      ))}
    </g>
  );
}

function RccpPoSegmentRect({
  x, y, width, height, segment, weekLabel, fill, highlighted,
}) {
  const hover = useContext(RccpSegmentHoverContext);
  const handleEnter = useCallback((event) => {
    hover?.onHover?.({
      segment,
      label: weekLabel,
      x: event.clientX,
      y: event.clientY,
    });
  }, [hover, segment, weekLabel]);
  const handleLeave = useCallback(() => hover?.onHover?.(null), [hover]);
  const handleClick = useCallback((event) => {
    event.stopPropagation();
    const sku = String(segment?.itemNumber || '').trim();
    if (sku) hover?.onClick?.(sku);
  }, [hover, segment]);
  const handleMouseDown = useCallback((event) => {
    event.preventDefault();
  }, []);
  const stroke = segment.late ? LATE_STROKE : (highlighted ? PAIR_STROKE : 'none');
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={segmentFillOpacity(segment.status, highlighted)}
      stroke={stroke}
      strokeWidth={segment.late || highlighted ? 2.5 : 0}
      pointerEvents="all"
      cursor="pointer"
      onMouseEnter={handleEnter}
      onMouseMove={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    />
  );
}

export const RccpPoStackBarAbove = memo(function RccpPoStackBarAbove(props) {
  return <RccpPoStackBar {...props} side="above" />;
});

export const RccpPoStackBarBelow = memo(function RccpPoStackBarBelow(props) {
  return <RccpPoStackBar {...props} side="below" />;
});
