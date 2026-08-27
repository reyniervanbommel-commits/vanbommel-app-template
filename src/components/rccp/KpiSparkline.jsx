import React, { memo } from 'react';
import { makeStyles } from '@fluentui/react-components';
import { buildSparklineAreaPath } from '../../utils/kpiSparklineSeries';

const useStyles = makeStyles({
  area: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  barTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '8px',
    display: 'flex',
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },
  barSeg: {
    display: 'block',
    height: '100%',
    flexShrink: 0,
  },
});

function KpiSparkline({ values, color, colors, variant = 'area' }) {
  const styles = useStyles();
  if (!Array.isArray(values) || !values.length) return null;

  if (variant === 'bar') {
    const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (!(total > 0)) return null;
    return (
      <div className={styles.barTrack} data-kpi-sparkline="bar" aria-hidden>
        {values.map((value, index) => {
          const width = ((Number(value) || 0) / total) * 100;
          if (!(width > 0)) return null;
          const fill = (colors && colors[index]) || color;
          return (
            <span
              key={`${index}-${fill}`}
              className={styles.barSeg}
              style={{
                width: `${width}%`,
                backgroundColor: fill,
                opacity: colors?.[index] ? 1 : Math.max(0.35, 1 - index * 0.35),
              }}
            />
          );
        })}
      </div>
    );
  }

  const { line, area } = buildSparklineAreaPath(values);
  if (!area) return null;
  return (
    <svg
      className={styles.area}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
      data-kpi-sparkline="area"
    >
      <path d={area} fill={color} fillOpacity="0.2" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default memo(KpiSparkline);
