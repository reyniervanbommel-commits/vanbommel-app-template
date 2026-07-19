import React, { memo } from 'react';
import { Card, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  item: { fontSize: tokens.fontSizeBase200 },
});

function RccpMissingDateCard({ items }) {
  const styles = useStyles();
  if (!items?.length) return null;
  return (
    <Card className={styles.card}>
      <Text weight="semibold">PO lines without a delivery date ({items.length})</Text>
      <Text size={200}>These lines are excluded from the live load calculation.</Text>
      {items.slice(0, 8).map((item) => (
        <Text key={`${item.orderNumber}-${item.lineNumber || 'h'}`} className={styles.item}>
          {item.orderNumber}{item.lineNumber ? ` / line ${item.lineNumber}` : ''} — qty {item.quantity}
        </Text>
      ))}
      {items.length > 8 && <Text size={200}>…and {items.length - 8} more</Text>}
    </Card>
  );
}

export default memo(RccpMissingDateCard);
