import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXXS,
    color: tokens.colorNeutralForeground1,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
});

function EncodingSwatch({ kind, color }) {
  return (
    <svg width="14" height="10" aria-hidden>
      <rect width="14" height="10" fill={color} fillOpacity={kind === 'received' ? 0.15 : 1} />
    </svg>
  );
}

function RccpChartLegend({
  payload, compact, openRow, deliveredRow, receivedColor,
}) {
  const styles = useStyles();
  const items = [];
  if (openRow) items.push({ key: 'open', label: 'Open', kind: 'solid', color: openRow.color });
  if (deliveredRow) {
    items.push({
      key: 'received', label: 'Received 15%', kind: 'received', color: receivedColor,
    });
  }
  (payload || []).forEach((entry) => {
    if (entry.dataKey === '__stackAbove' || entry.dataKey === '__stackBelow') return;
    items.push({
      key: `extra-${entry.dataKey || entry.value}`,
      label: entry.value,
      kind: 'solid',
      color: entry.color,
    });
  });
  return (
    <div className={styles.legend} style={{ fontSize: compact ? '11px' : '12px' }}>
      {items.map((item) => (
        <span key={item.key} className={styles.item}>
          <EncodingSwatch kind={item.kind} color={item.color} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default RccpChartLegend;
