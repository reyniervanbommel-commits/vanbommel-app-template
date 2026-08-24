import React, { memo } from 'react';
import { stackRectLayout } from './rccpPoStack';

const LATE_STROKE = '#D13438';

function RccpPoStackBar({
  x, y, width, height, payload, side,
}) {
  const segments = side === 'above'
    ? (payload?.segmentsAbove || [])
    : (payload?.segmentsBelow || []);
  const layout = stackRectLayout(segments, y, height, side);
  if (!width || !layout.length) return null;
  const onHover = payload?.__onSegmentHover;
  return (
    <g>
      {layout.map(({ y: rectY, height: rectH, segment }, index) => (
        <rect
          key={`${segment.poNumber}-${segment.status}-${index}`}
          x={x}
          y={rectY}
          width={width}
          height={rectH}
          fill={segment.status === 'open' ? payload.__openColor : payload.__receivedColor}
          stroke={segment.late ? LATE_STROKE : 'none'}
          strokeWidth={segment.late ? 2 : 0}
          onMouseEnter={() => onHover?.(segment)}
          onMouseLeave={() => onHover?.(null)}
        />
      ))}
    </g>
  );
}

export const RccpPoStackBarAbove = memo(function RccpPoStackBarAbove(props) {
  return <RccpPoStackBar {...props} side="above" />;
});

export const RccpPoStackBarBelow = memo(function RccpPoStackBarBelow(props) {
  return <RccpPoStackBar {...props} side="below" />;
});
