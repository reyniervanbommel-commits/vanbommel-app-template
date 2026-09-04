import React, { memo, useMemo } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { RCCP_CHART_Y_AXIS_WIDTH } from './rccpUtils';

/**
 * Y-axis labels for the RCCP capacity/load chart. Rendered inside the same
 * horizontally scrolling pane as the chart bars, but pinned to the left edge
 * via a zero-width `position: sticky` wrapper (inline style, not a Griffel
 * class) so it tracks the pane's own scrollLeft instead of the viewport.
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
    transform: 'translateY(-50%)',
    textAlign: 'right',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
});

function buildTicks(yDomain, height) {
  const [min, max] = Array.isArray(yDomain) && yDomain.length === 2 ? yDomain : [0, 1];
  const span = (max - min) || 1;
  const values = [max, (max + min) / 2, min];
  return values.map((value) => ({
    value,
    top: ((max - value) / span) * height,
  }));
}

function RccpStickyChartYAxis({ height = 240, compact = false, yDomain = [0, 1] }) {
  const styles = useStyles();
  const ticks = useMemo(() => buildTicks(yDomain, height), [yDomain, height]);

  return (
    <div style={{ position: 'sticky', left: 0, width: 0, height: 0, zIndex: 2 }}>
      <div
        data-testid="rccp-sticky-y-axis"
        className={styles.axis}
        style={{ height, fontSize: compact ? tokens.fontSizeBase100 : undefined }}
      >
        {ticks.map((tick, index) => (
          <span key={`${tick.value}-${index}`} className={styles.tick} style={{ top: `${tick.top}px` }}>
            {Math.round(tick.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(RccpStickyChartYAxis);
