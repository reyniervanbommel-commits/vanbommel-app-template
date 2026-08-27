import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { RCCP_ITEM_PALETTE } from './rccpItemColor';

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

export function RccpConfirmedHatchDefs() {
  return (
    <defs>
      <pattern id="rccpConfirmedHatch" patternUnits="userSpaceOnUse" width="12" height="12">
        <path
          d="M0 12 L12 0"
          stroke={tokens.colorNeutralForeground1}
          strokeWidth="1.25"
          strokeOpacity={0.5}
        />
      </pattern>
    </defs>
  );
}

function EncodingSwatch({ kind, color }) {
  if (kind === 'hatch') {
    return (
      <svg width="14" height="10" aria-hidden>
        <defs>
          <pattern id="rccpLegendHatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path
              d="M0 6 L6 0"
              stroke={tokens.colorNeutralForeground1}
              strokeWidth="1"
              strokeOpacity={0.55}
            />
          </pattern>
        </defs>
        <rect width="14" height="10" fill={color} />
        <rect
          width="14"
          height="10"
          fill="url(#rccpLegendHatch)"
          style={{ mixBlendMode: 'multiply' }}
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="10" aria-hidden>
      <rect width="14" height="10" fill={color} fillOpacity={kind === 'received' ? 0.25 : 1} />
    </svg>
  );
}

function RccpChartLegend({
  payload, compact, openRow, deliveredRow, receivedColor, showConfirmed,
}) {
  const styles = useStyles();
  const openColor = String(openRow?.color || '');
  const hatchColor = RCCP_ITEM_PALETTE.find((c) => c.toLowerCase() !== openColor.toLowerCase())
    || RCCP_ITEM_PALETTE[0];
  const items = [];
  if (openRow) items.push({ key: 'open', label: 'Open', kind: 'solid', color: openRow.color });
  if (deliveredRow) {
    items.push({
      key: 'received', label: 'Received 25%', kind: 'received', color: receivedColor,
    });
  }
  if (showConfirmed) {
    items.push({ key: 'confirmed', label: 'Confirmed', kind: 'hatch', color: hatchColor });
  }
  (payload || []).forEach((entry) => {
    if (entry.dataKey === '__stackAbove' || entry.dataKey === '__stackBelow'
      || entry.dataKey === '__stackConfirmed') return;
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
