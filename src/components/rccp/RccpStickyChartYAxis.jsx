import React, { memo, useMemo } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { RCCP_CHART_Y_AXIS_WIDTH, rccpChartPlotArea } from './rccpUtils';
import { rccpChartYTicks } from './rccpPoStack';

/**
 * Y-axis labels for the RCCP capacity/load chart. Rendered inside the same
 * horizontally scrolling pane as the chart bars, but pinned via a zero-width
 * `position: sticky` wrapper (inline style, not a Griffel class) so it tracks the
 * pane's own scrollLeft instead of the viewport. `left` places the labels right
 * against the plot area (the row-label gutter), not at the far left of the pane.
 */
const useStyles = makeStyles({
  axis: {
    position: 'relative',
    width: `${RCCP_CHART_Y_AXIS_WIDTH}px`,
    pointerEvents: 'none',
  },
  tick: {
    position: 'absolute',
    left: 0,
    right: '6px',
    textAlign: 'right',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  // Overrides the inherited `pointer-events: none` from .axis so long-press + drag works, without
  // making the rest of the sticky pane (which is 0×0 anyway) capture clicks meant for the chart.
  hitArea: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'auto',
    cursor: 'ns-resize',
    touchAction: 'none',
  },
  zoomBadge: {
    position: 'absolute',
    left: 0,
    transform: 'translateY(-50%)',
    padding: '2px 6px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
});

/**
 * One label per gridline, using the same tick values as the chart itself. Top and bottom
 * labels are aligned inside the plot height instead of centred on the tick, so neither is
 * clipped by the chart pane.
 */
export function buildRccpAxisTicks(yDomain, plotArea) {
  const { ticks, step } = rccpChartYTicks(yDomain);
  const max = ticks[0];
  const min = ticks[ticks.length - 1];
  const span = (max - min) || 1;
  const decimals = step < 1 ? Math.min(2, Math.ceil(-Math.log10(step))) : 0;
  return ticks.map((value, index) => ({
    value,
    text: value.toFixed(decimals),
    top: plotArea.top + ((max - value) / span) * plotArea.height,
    shift: index === 0 ? '0' : (index === ticks.length - 1 ? '-100%' : '-50%'),
  }));
}

function RccpStickyChartYAxis({
  height = 240, compact = false, yDomain = [0, 1], left = 0,
  dragHandlers = null, isDragging = false, isScaled = false, zoomPercent = 100,
}) {
  const styles = useStyles();
  const ticks = useMemo(
    () => buildRccpAxisTicks(yDomain, rccpChartPlotArea(height)),
    [yDomain, height],
  );

  return (
    <div style={{ position: 'sticky', left, width: 0, height: 0, zIndex: 2 }}>
      <div
        data-testid="rccp-sticky-y-axis"
        className={styles.axis}
        style={{ height, fontSize: compact ? tokens.fontSizeBase100 : undefined }}
      >
        {ticks.map((tick, index) => (
          <span
            key={`${tick.value}-${index}`}
            className={styles.tick}
            style={{ top: `${tick.top}px`, transform: `translateY(${tick.shift})` }}
          >
            {tick.text}
          </span>
        ))}
        {dragHandlers && (
          <div
            data-testid="rccp-y-axis-drag-handle"
            className={styles.hitArea}
            style={{ cursor: isDragging ? 'grabbing' : 'ns-resize' }}
            title="Press and hold, then drag to zoom the Y-axis. Double-click to reset."
            aria-label="Adjust Y-axis scale: press and hold, then drag up or down. Double-click to reset."
            role="slider"
            aria-valuenow={zoomPercent}
            tabIndex={0}
            {...dragHandlers}
          />
        )}
        {(isDragging || isScaled) && (
          <span className={styles.zoomBadge} style={{ top: `${height / 2}px` }}>
            {zoomPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(RccpStickyChartYAxis);
