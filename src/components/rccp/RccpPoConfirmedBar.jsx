import React, { memo } from 'react';
import { stackRectLayout, weekBarBox } from './rccpPoStack';

/**
 * Right-slot confirmed bar shell. Renders nothing until segments exist; no hatching yet.
 */
function RccpPoConfirmedBar({ y, height, payload, index }) {
  const segments = payload?.segmentsConfirmed || [];
  if (!segments.length) return null;
  const box = weekBarBox(index, payload?.__barWidthConfirmed, 'right');
  const layout = stackRectLayout(segments, y, height, 'above');
  if (!box.width || !layout.length) return null;
  return (
    <g>
      {layout.map(({ y: rectY, height: rectH, segment }, segIndex) => (
        <rect
          key={`${segment.itemNumber}-confirmed-${segIndex}`}
          x={box.x}
          y={rectY}
          width={box.width}
          height={rectH}
          fill="none"
        />
      ))}
    </g>
  );
}

export default memo(RccpPoConfirmedBar);
