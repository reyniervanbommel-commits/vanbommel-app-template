import React from 'react';
import { tokens } from '@fluentui/react-components';

/**
 * Tooltip cursor: vertical line at the centre of the hovered period.
 * Recharts spreads chart offset as top-level left/top/height props — not as `offset`.
 */
export function hoverCursorX(points) {
  if (!points?.length) return null;
  return points[0].x;
}

export function RccpWeekBandCursor(props) {
  const { points, top, height } = props;
  const x = hoverCursorX(points);
  if (x == null || top == null || height == null) return null;

  return (
    <line
      x1={x}
      y1={top}
      x2={x}
      y2={top + height}
      stroke={tokens.colorNeutralStroke1}
      strokeWidth={1.5}
      pointerEvents="none"
      className="recharts-tooltip-cursor"
    />
  );
}

export default RccpWeekBandCursor;
