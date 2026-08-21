import React from 'react';
import { Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalL),
    color: tokens.colorNeutralForeground2,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  swatch: {
    width: '12px',
    height: '12px',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
});

const ITEMS = [
  { label: 'Open', color: tokens.colorPaletteBlueForeground2, opacity: 1 },
  { label: 'Delivered', color: tokens.colorPaletteBlueForeground2, opacity: 0.2 },
  { label: 'Overdue', color: tokens.colorPaletteRedForeground1, opacity: 0.78 },
  { label: 'Capacity', color: tokens.colorPaletteRedForeground1, dashed: true },
];

export default function RccpDeliveryPlanLegend() {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {ITEMS.map((item) => (
        <div key={item.label} className={styles.item}>
          <span
            className={styles.swatch}
            style={{
              backgroundColor: item.color,
              opacity: item.opacity ?? 1,
              border: item.dashed ? `1px dashed ${item.color}` : undefined,
            }}
          />
          <Text size={200}>{item.label}</Text>
        </div>
      ))}
    </div>
  );
}
