import React, { memo } from 'react';
import { tokens } from '@fluentui/react-components';

function truncateLabel(value, max = 10) {
  const text = String(value ?? '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function ChartAxisTick({ x, y, payload }) {
  const label = String(payload?.value ?? '');
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={tokens.colorNeutralForeground2}
        fontSize={10}
      >
        <title>{label}</title>
        {truncateLabel(label, 10)}
      </text>
    </g>
  );
}

export default memo(ChartAxisTick);
