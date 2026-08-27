import React, { memo, useCallback, useContext } from 'react';
import { RccpSegmentHoverContext } from './RccpPoStackBar';
import { rccpItemColor } from './rccpItemColor';
import { isRccpItemHighlight, stackRectLayout, weekBarBox } from './rccpPoStack';

const LATE_STROKE = '#D13438';
const PAIR_STROKE = '#323130';

function ConfirmedSegmentRect({
  x, y, width, height, segment, weekLabel, fill, highlighted,
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
    hover?.onClick?.({
      segment,
      label: weekLabel,
      x: event.clientX,
      y: event.clientY,
    });
  }, [hover, segment, weekLabel]);
  const stroke = segment.late ? LATE_STROKE : (highlighted ? PAIR_STROKE : 'none');
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={segment.late || highlighted ? 2.5 : 0}
        pointerEvents="all"
        cursor="pointer"
        onMouseEnter={handleEnter}
        onMouseMove={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleClick}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="url(#rccpConfirmedHatch)"
        style={{ mixBlendMode: 'multiply' }}
        pointerEvents="none"
      />
    </g>
  );
}

function RccpPoConfirmedBar({ y, height, payload, index }) {
  const hover = useContext(RccpSegmentHoverContext);
  const highlightItem = hover?.highlightItem || '';
  const segments = payload?.segmentsConfirmed || [];
  if (!segments.length) return null;
  const box = weekBarBox(index, payload?.__barWidthConfirmed, 'right');
  const layout = stackRectLayout(segments, y, height, 'above');
  if (!box.width || !layout.length) return null;
  return (
    <g>
      {layout.map(({ y: rectY, height: rectH, segment }, segIndex) => (
        <ConfirmedSegmentRect
          key={`${segment.itemNumber}-confirmed-${segIndex}`}
          x={box.x}
          y={rectY}
          width={box.width}
          height={rectH}
          segment={segment}
          weekLabel={payload?.key}
          fill={rccpItemColor(segment.itemNumber, { openColor: payload?.__openColor })}
          highlighted={isRccpItemHighlight(segment, highlightItem)}
        />
      ))}
    </g>
  );
}

export default memo(RccpPoConfirmedBar);
