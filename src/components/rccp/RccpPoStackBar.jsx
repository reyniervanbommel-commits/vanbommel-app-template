import React, { createContext, memo, useCallback, useContext } from 'react';
import { isReceivedPairHighlight, stackRectLayout } from './rccpPoStack';

const LATE_STROKE = '#D13438';
const PAIR_STROKE = '#323130';
const RECEIVED_ABOVE_OPACITY = 0.5;
const RECEIVED_ABOVE_HIGHLIGHT_OPACITY = 0.9;

export const RccpSegmentHoverContext = createContext(null);

function segmentFillOpacity(status, side, highlighted) {
  if (status === 'received' && side === 'above') {
    return highlighted ? RECEIVED_ABOVE_HIGHLIGHT_OPACITY : RECEIVED_ABOVE_OPACITY;
  }
  return 1;
}

function RccpPoStackBar({
  x, y, width, height, payload, side,
}) {
  const hover = useContext(RccpSegmentHoverContext);
  const highlightPo = hover?.highlightPo || '';
  const segments = side === 'above'
    ? (payload?.segmentsAbove || [])
    : (payload?.segmentsBelow || []);
  const layout = stackRectLayout(segments, y, height, side);
  if (!width || !layout.length) return null;
  return (
    <g>
      {layout.map(({ y: rectY, height: rectH, segment }, index) => (
        <RccpPoSegmentRect
          key={`${segment.poNumber}-${segment.status}-${index}`}
          x={x}
          y={rectY}
          width={width}
          height={rectH}
          segment={segment}
          weekLabel={payload?.key}
          fill={segment.status === 'open' ? payload.__openColor : payload.__receivedColor}
          side={side}
          highlighted={isReceivedPairHighlight(segment, highlightPo)}
        />
      ))}
    </g>
  );
}

function RccpPoSegmentRect({
  x, y, width, height, segment, weekLabel, fill, side, highlighted,
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
  const stroke = segment.late ? LATE_STROKE : (highlighted ? PAIR_STROKE : 'none');
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={segmentFillOpacity(segment.status, side, highlighted)}
      stroke={stroke}
      strokeWidth={segment.late || highlighted ? 2.5 : 0}
      pointerEvents="all"
      cursor="pointer"
      onMouseEnter={handleEnter}
      onMouseMove={handleEnter}
      onMouseLeave={handleLeave}
    />
  );
}

export const RccpPoStackBarAbove = memo(function RccpPoStackBarAbove(props) {
  return <RccpPoStackBar {...props} side="above" />;
});

export const RccpPoStackBarBelow = memo(function RccpPoStackBarBelow(props) {
  return <RccpPoStackBar {...props} side="below" />;
});
