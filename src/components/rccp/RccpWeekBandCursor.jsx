import React from 'react';
import { tokens } from '@fluentui/react-components';
import { RCCP_WEEK_COL_WIDTH } from './rccpUtils';

/**
 * Tooltip cursor: vertical line at ISO week start (aligned with chart grid).
 * Recharts spreads chart offset as top-level left/top/height props — not as `offset`.
 */
export function RccpWeekBandCursor(props) {
  const { points, left, top, height } = props;
  if (!points?.length || top == null || height == null) return null;

  const weekStartX = points[0].x - RCCP_WEEK_COL_WIDTH / 2;

  return (
    <line
      x1={weekStartX}
      y1={top}
      x2={weekStartX}
      y2={top + height}
      stroke={tokens.colorNeutralStroke1}
      strokeWidth={1.5}
      pointerEvents="none"
      className="recharts-tooltip-cursor"
    />
  );
}

export default RccpWeekBandCursor;
