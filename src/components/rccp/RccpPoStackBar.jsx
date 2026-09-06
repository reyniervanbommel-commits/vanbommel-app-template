import React, { createContext, memo, useCallback, useContext } from 'react';
import {
  isReceivedPairHighlight,
  poSegmentStroke,
  stackRectLayout,
  weekBarBox,
  RCCP_OUTLINE_STROKE_COLOR,
  RCCP_OUTLINE_STROKE_WIDTH,
} from './rccpPoStack';

export const RccpSegmentHoverContext = createContext(null);

/** Segment list, bar width, x-offset and fill style for one stack. */
function stackShape(payload, side, overlay) {
  if (side === 'below') {
    return {
      segments: payload?.segmentsBelow || [],
      barWidth: Number(payload?.__barWidthBelow),
      offset: 0,
      outline: false,
    };
  }
  return {
    segments: (overlay ? payload?.segmentsAboveAlt : payload?.segmentsAbove) || [],
    barWidth: Number(payload?.__barWidthAbove),
    offset: Number(overlay ? payload?.__barOffsetAboveAlt : payload?.__barOffsetAbove) || 0,
    outline: Boolean(overlay ? payload?.__outlineAboveAlt : payload?.__outlineAbove),
  };
}

function RccpPoStackBar({
  y, height, payload, side, index, overlay = false,
}) {
  const hover = useContext(RccpSegmentHoverContext);
  const highlightItem = hover?.highlightItem || '';
  const { segments, barWidth, offset, outline } = stackShape(payload, side, overlay);
  const layout = stackRectLayout(segments, y, height, side);
  const box = weekBarBox(index, barWidth, offset);
  if (!box.width || !layout.length) return null;
  const outerTop = Math.min(...layout.map((part) => part.y));
  const outerBottom = Math.max(...layout.map((part) => part.y + part.height));
  const outerHeight = Math.max(0, outerBottom - outerTop);
  const stackColor = side === 'below' ? payload.__receivedColor : payload.__openColor;
  return (
    <g>
      {/* Eén vlak voor de hele staaf: losse vakjes per item laten anders witte naden zien. */}
      {outline ? null : (
        <rect
          x={box.x}
          y={outerTop}
          width={box.width}
          height={outerHeight}
          fill={stackColor}
          pointerEvents="none"
        />
      )}
      {layout.map(({ y: rectY, height: rectH, segment }, segIndex) => (
        <RccpPoSegmentRect
          key={`${segment.itemNumber}-${segment.status}-${segIndex}`}
          x={box.x}
          y={rectY}
          width={box.width}
          height={rectH}
          segment={segment}
          weekLabel={payload?.key}
          highlighted={isReceivedPairHighlight(segment, highlightItem)}
        />
      ))}
      {/* Eén rand om de hele staaf: in de eigen kleur, of donkergrijs voor confirmed. */}
      <rect
        x={box.x}
        y={outerTop}
        width={box.width}
        height={outerHeight}
        fill="none"
        stroke={outline ? RCCP_OUTLINE_STROKE_COLOR : stackColor}
        strokeWidth={RCCP_OUTLINE_STROKE_WIDTH}
        pointerEvents="none"
      />
    </g>
  );
}

/** Transparent hit area per item: the stack itself is painted as one rect. */
function RccpPoSegmentRect({
  x, y, width, height, segment, weekLabel, highlighted,
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
  const handleClick = useCallback((event) => {
    event.stopPropagation();
    const sku = String(segment?.itemNumber || '').trim();
    if (sku) hover?.onClick?.(sku);
  }, [hover, segment]);
  const handleMouseDown = useCallback((event) => {
    event.preventDefault();
  }, []);
  const { stroke, strokeWidth } = poSegmentStroke(segment, highlighted);
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="none"
      stroke={highlighted ? stroke : 'none'}
      strokeWidth={highlighted ? strokeWidth : 0}
      pointerEvents="all"
      cursor="pointer"
      onMouseEnter={handleEnter}
      onMouseMove={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    />
  );
}

export const RccpPoStackBarAbove = memo(function RccpPoStackBarAbove(props) {
  return <RccpPoStackBar {...props} side="above" />;
});

/** Second load-date series above the axis (confirmed next to requested). */
export const RccpPoStackBarAboveAlt = memo(function RccpPoStackBarAboveAlt(props) {
  return <RccpPoStackBar {...props} side="above" overlay />;
});

export const RccpPoStackBarBelow = memo(function RccpPoStackBarBelow(props) {
  return <RccpPoStackBar {...props} side="below" />;
});
