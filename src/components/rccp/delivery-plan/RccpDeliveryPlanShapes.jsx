import React, { useCallback } from 'react';
import { tokens } from '@fluentui/react-components';

const DELIVERED_FILL = 0.06;
const DELIVERED_STROKE = 0.22;
const OVERDUE_FILL = 0.78;
const OVERDUE_STROKE = tokens.colorPaletteRedForeground1;

function stackRects(x, y, width, height, segments, total) {
  const absHeight = Math.abs(height);
  const bottom = height < 0 ? y : y + absHeight;
  const direction = height < 0 ? 1 : -1;
  const safeTotal = total || 1;
  let offset = 0;
  return (segments || []).map((segment) => {
    const h = absHeight * (segment.qty / safeTotal);
    const top = bottom + direction * offset + (direction < 0 ? -h : 0);
    offset += h;
    return { ...segment, x, y: top, width, height: h };
  });
}

function SegmentRect({
  rect, selected, onHover, onSelect,
}) {
  const handleEnter = useCallback(() => onHover?.(rect.orderId), [onHover, rect.orderId]);
  const handleLeave = useCallback(() => onHover?.(null), [onHover]);
  const handleClick = useCallback(() => onSelect?.(rect.orderId), [onSelect, rect.orderId]);
  const isOpen = rect.type === 'open';
  const fillOpacity = rect.type === 'delivered' ? DELIVERED_FILL : (rect.overdue ? OVERDUE_FILL : 1);
  const stroke = rect.overdue ? OVERDUE_STROKE : rect.color;
  const strokeOpacity = rect.type === 'delivered' ? DELIVERED_STROKE : 1;
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={Math.max(rect.height, 0)}
      fill={rect.color}
      fillOpacity={fillOpacity}
      stroke={stroke}
      strokeOpacity={selected ? 1 : strokeOpacity}
      strokeWidth={rect.overdue ? 3 : (selected ? 2 : (isOpen ? 1 : 1))}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    />
  );
}

export function PlanningBarShape(props) {
  const {
    x, y, width, height, payload, selectedOrderId, onHover, onSelect, onLayout,
  } = props;
  const rects = stackRects(x, y, width, height, payload?.planningSegments, payload?.planningTotal);
  rects.forEach((rect) => onLayout?.(rect.orderId, 'plan', rect));
  return (
    <g>
      {rects.map((rect) => (
        <SegmentRect
          key={`${rect.orderId}-${rect.type}`}
          rect={rect}
          selected={selectedOrderId === rect.orderId}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
}

export function ReceiptBarShape(props) {
  const {
    x, y, width, height, payload, selectedOrderId, onHover, onSelect, onLayout,
  } = props;
  const rects = stackRects(x, y, width, height, payload?.receiptSegments, payload?.receiptTotal);
  rects.forEach((rect) => onLayout?.(rect.orderId, 'receipt', rect));
  return (
    <g>
      {rects.map((rect) => (
        <SegmentRect
          key={`${rect.orderId}-${rect.type}`}
          rect={rect}
          selected={selectedOrderId === rect.orderId}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {(payload?.receiptSegments || []).map((segment) => {
        const rect = rects.find((item) => item.orderId === segment.orderId);
        const label = segment.delayWeeks ? (segment.delayWeeks > 0 ? `+${segment.delayWeeks}w` : `−${Math.abs(segment.delayWeeks)}w`) : '';
        if (!rect || !label) return null;
        return (
          <text
            key={`delay-${segment.orderId}`}
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height + 12}
            textAnchor="middle"
            fontSize={10}
            fill={tokens.colorNeutralForeground2}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}
