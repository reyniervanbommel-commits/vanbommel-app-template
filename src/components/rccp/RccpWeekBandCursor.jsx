import React from 'react';
import { tokens } from '@fluentui/react-components';

/**
 * Vertical line at the centre of the hovered period. Purely presentational — the position
 * (`x`) is computed by the caller via `rccpHoverCenterX` (rccpUtils), from the real mouse
 * position, not from Recharts' own (mis-offset) band scale.
 */
export function RccpWeekBandCursor({ x, top, height }) {
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
