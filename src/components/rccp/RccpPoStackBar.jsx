import React, { createContext, memo, useCallback, useContext } from 'react';
import { stackRectLayout } from './rccpPoStack';

const LATE_STROKE = '#D13438';
const RECEIVED_ABOVE_OPACITY = 0.5;

export const RccpSegmentHoverContext = createContext(null);

function segmentFillOpacity(status, side) {
  return status === 'received' && side === 'above' ? RECEIVED_ABOVE_OPACITY : 1;
}

function RccpPoStackBar({
  x, y, width, height, payload, side,
}) {
  const onHover = useContext(RccpSegmentHoverContext);
  const segments = side === 'above'
    ? (payload?.segmentsAbove || [])
    : (payload?.segmentsBelow || []);
  const layout = stackRectLayout(segments, y, height, side);
  const handleLeave = useCallback(() => onHover?.(null), [onHover]);
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
          fillOpacity={segmentFillOpacity(segment.status, side)}
          onHover={onHover}
          onLeave={handleLeave}
        />
      ))}
    </g>
  );
}

function RccpPoSegmentRect({
  x, y, width, height, segment, weekLabel, fill, fillOpacity, onHover, onLeave,
}) {
  const handleEnter = useCallback((event) => {
    onHover?.({
      segment,
      label: weekLabel,
      x: event.clientX,
      y: event.clientY,
    });
  }, [onHover, segment, weekLabel]);
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={segment.late ? LATE_STROKE : 'none'}
      strokeWidth={segment.late ? 2 : 0}
      pointerEvents="all"
      cursor="pointer"
      onMouseEnter={handleEnter}
      onMouseMove={handleEnter}
      onMouseLeave={onLeave}
    />
  );
}

export const RccpPoStackBarAbove = memo(function RccpPoStackBarAbove(props) {
  return <RccpPoStackBar {...props} side="above" />;
});

export const RccpPoStackBarBelow = memo(function RccpPoStackBarBelow(props) {
  return <RccpPoStackBar {...props} side="below" />;
});
