import React, { memo } from 'react';
import { Card, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  row: { fontSize: tokens.fontSizeBase200 },
});

function RccpDiagnosticsCard({ diagnostics, config, window }) {
  const styles = useStyles();
  if (!diagnostics) return null;

  return (
    <Card className={styles.card}>
      <Text weight="semibold">Load diagnostics</Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Columns: vendor={config?.vendorColumnKey}, date={config?.dateColumnKey},
        measures={(config?.quantityMeasures || []).map((m) => m.columnKey).join(', ') || '—'}
      </Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Window: {window?.fromYear}-W{window?.fromWeek} → {window?.toYear}-W{window?.toWeek}
      </Text>
      <Text className={styles.row}>PO orders scanned: {diagnostics.orderCount}</Text>
      <Text className={styles.row}>PO lines scanned: {diagnostics.lineCount}</Text>
      <Text className={styles.row}>Lines counted in confirmed load: {diagnostics.countedLines}</Text>
      <Text className={styles.row}>Total confirmed quantity: {diagnostics.totalConfirmedQty}</Text>
      <Text className={styles.row}>Excluded by status: {diagnostics.excludedLines}</Text>
      <Text className={styles.row}>Missing delivery date: {diagnostics.missingDateLines}</Text>
      <Text className={styles.row}>Outside selected weeks: {diagnostics.outOfWindowLines}</Text>
      <Text className={styles.row}>Zero quantity (check qty column): {diagnostics.zeroQuantityLines}</Text>
      <Text className={styles.row}>Orders without vendor: {diagnostics.missingVendorOrders}</Text>
    </Card>
  );
}

export default memo(RccpDiagnosticsCard);
