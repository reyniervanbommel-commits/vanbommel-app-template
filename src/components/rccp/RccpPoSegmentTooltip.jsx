import React, { memo } from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  box: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    pointerEvents: 'none',
  },
  late: { color: tokens.colorPaletteRedForeground1 },
});

function RccpPoSegmentTooltip({ active, label, segment }) {
  const styles = useStyles();
  if (!active || !segment) return null;
  const status = segment.status === 'open' ? 'Open' : 'Received';
  return (
    <div className={styles.box}>
      <div>{`PO: ${segment.poNumber}`}</div>
      <div>{`Status: ${status}`}</div>
      <div>{`Quantity: ${segment.qty}`}</div>
      <div>{`Week: ${label || ''}`}</div>
      {segment.late ? <div className={styles.late}>Late</div> : null}
    </div>
  );
}

export default memo(RccpPoSegmentTooltip);
