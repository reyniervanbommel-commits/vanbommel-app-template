import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { kpiPieColors, kpiPiePercent, pieSlicePath } from './kpiPctPieUtils';

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    right: `calc(-1 * ${tokens.spacingVerticalL})`,
    top: '50%',
    transform: 'translateY(-50%)',
    height: `calc((100% + (2 * ${tokens.spacingVerticalL})) * 0.6)`,
    aspectRatio: '1 / 1',
    width: 'auto',
    pointerEvents: 'none',
    zIndex: 0,
  },
  svg: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
});

function KpiPctPie({ percent, fillColor }) {
  const styles = useStyles();
  const share = kpiPiePercent(percent);
  if (share === null) return null;
  const { fill, rest } = kpiPieColors(fillColor);
  const slice = pieSlicePath(share);
  return (
    <div className={styles.root} data-kpi-pct-pie="" aria-hidden="true">
      <svg viewBox="0 0 100 100" className={styles.svg} focusable="false">
        <circle cx="50" cy="50" r="50" fill={rest} />
        {slice ? <path d={slice} fill={fill} /> : null}
      </svg>
    </div>
  );
}

export default KpiPctPie;
