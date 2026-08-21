import React from 'react';
import { tokens } from '@fluentui/react-components';

function layoutCenter(rect) {
  if (!rect) return null;
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export default function RccpDeliveryPlanOverlay({
  todayKey,
  selectedOrderId,
  layouts,
  points,
  xAxisMap,
  yAxisMap,
}) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis) return null;

  const scaleX = xAxis.scale;
  const scaleY = yAxis.scale;
  const todayX = todayKey ? scaleX(todayKey) : null;
  const bandWidth = typeof xAxis.bandSize === 'number' ? xAxis.bandSize : 24;
  const selected = selectedOrderId ? layouts[selectedOrderId] : null;
  const from = layoutCenter(selected?.plan);
  const to = layoutCenter(selected?.receipt);

  return (
    <g>
      {todayX != null && (
        <>
          <rect
            x={todayX - 2}
            y={yAxis.y}
            width={bandWidth + 4}
            height={yAxis.height}
            fill={tokens.colorNeutralBackground4}
            fillOpacity={0.55}
          />
          <line
            x1={todayX + bandWidth / 2}
            x2={todayX + bandWidth / 2}
            y1={yAxis.y}
            y2={yAxis.y + yAxis.height}
            stroke={tokens.colorNeutralForeground2}
            strokeWidth={1}
          />
          <text
            x={todayX + bandWidth / 2}
            y={yAxis.y + 12}
            textAnchor="middle"
            fontSize={11}
            fill={tokens.colorNeutralForeground1}
          >
            Today
          </text>
        </>
      )}
      {(points || []).map((point) => {
        if (point.capacity == null) return null;
        const x = scaleX(point.key);
        if (x == null) return null;
        const y = scaleY(point.capacity);
        const next = (points || []).find((item) => item.key !== point.key
          && (points.indexOf(item) === points.indexOf(point) + 1));
        const x2 = next && next.capacity != null ? scaleX(next.key) : x + bandWidth;
        const y2 = next && next.capacity != null ? scaleY(next.capacity) : y;
        const over = point.overCapacity;
        return (
          <g key={`cap-${point.key}`}>
            <line
              x1={x}
              y1={y}
              x2={x2}
              y2={y2}
              stroke={tokens.colorPaletteRedForeground1}
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
            {over > 0 && (
              <>
                <rect
                  x={x}
                  y={scaleY(point.planningTotal)}
                  width={bandWidth}
                  height={Math.max(0, scaleY(point.capacity) - scaleY(point.planningTotal))}
                  fill={tokens.colorPaletteRedBackground2}
                  fillOpacity={0.35}
                />
                <text
                  x={x + bandWidth / 2}
                  y={scaleY(point.planningTotal) - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill={tokens.colorPaletteRedForeground1}
                >
                  {`+${over}`}
                </text>
              </>
            )}
          </g>
        );
      })}
      {from && to && (
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={tokens.colorNeutralForeground2}
          strokeWidth={1.5}
        />
      )}
    </g>
  );
}
