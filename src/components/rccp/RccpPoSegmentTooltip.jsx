import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { makeStyles, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  box: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#d1d1d1'),
    ...shorthands.padding('8px', '12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
    fontSize: '12px',
    color: '#323130',
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
  },
  late: { color: '#D13438' },
});

function RccpPoSegmentTooltip({ active, label, segment }) {
  const styles = useStyles();
  if (!active || !segment) return null;
  const status = segment.status === 'open' ? 'Open' : 'Received';
  return (
    <div className={styles.box} role="tooltip">
      <div>{`PO: ${segment.poNumber}`}</div>
      <div>{`Status: ${status}`}</div>
      <div>{`Quantity: ${segment.qty}`}</div>
      <div>{`Week: ${label || ''}`}</div>
      {segment.late ? <div className={styles.late}>Late</div> : null}
    </div>
  );
}

export function RccpPoSegmentHoverCard({ hover }) {
  if (!hover?.segment || typeof document === 'undefined') return null;
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: hover.x + 12,
        top: hover.y + 12,
        zIndex: 2000000,
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
      }}
    >
      <RccpPoSegmentTooltip active segment={hover.segment} label={hover.label} />
    </div>,
    document.body,
  );
}

export default memo(RccpPoSegmentTooltip);
