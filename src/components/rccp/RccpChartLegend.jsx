import React, { memo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    width: '100%',
    boxSizing: 'border-box',
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  compact: { fontSize: tokens.fontSizeBase100 },
  regular: { fontSize: tokens.fontSizeBase200 },
});

const SWATCH = { width: 12, height: 12 };

/** Bar, outlined bar or line sample, matching how the series is drawn in the chart. */
function LegendSwatch({ item }) {
  if (item.line) {
    return (
      <svg width={SWATCH.width} height={SWATCH.height} aria-hidden>
        <line
          x1={0}
          x2={SWATCH.width}
          y1={SWATCH.height / 2}
          y2={SWATCH.height / 2}
          stroke={item.color}
          strokeWidth={2}
          strokeDasharray={item.dashed ? '4 2' : undefined}
        />
      </svg>
    );
  }
  return (
    <svg width={SWATCH.width} height={SWATCH.height} aria-hidden>
      <rect
        x={item.outline ? 0.75 : 0}
        y={item.outline ? 0.75 : 0}
        width={SWATCH.width - (item.outline ? 1.5 : 0)}
        height={SWATCH.height - (item.outline ? 1.5 : 0)}
        fill={item.outline ? 'none' : item.color}
        stroke={item.outline ? item.outlineColor || item.color : 'none'}
        strokeWidth={item.outline ? 1.5 : 0}
      />
    </svg>
  );
}

/**
 * Chart legend rendered outside the horizontally scrolling chart pane, so it stays centred
 * and visible no matter how far the week columns are scrolled.
 * @param {{ items: Array<{key: string, label: string, color: string, line?: boolean, dashed?: boolean, outline?: boolean, outlineColor?: string}> }} props
 */
function RccpChartLegend({ items, compact = false }) {
  const styles = useStyles();
  if (!items?.length) return null;
  return (
    <div
      className={styles.root}
      role="list"
      aria-label="Chart legend"
      style={{ minHeight: compact ? 24 : 28 }}
    >
      {items.map((item) => (
        <span
          key={item.key}
          role="listitem"
          className={`${styles.item} ${compact ? styles.compact : styles.regular}`}
        >
          <LegendSwatch item={item} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default memo(RccpChartLegend);
