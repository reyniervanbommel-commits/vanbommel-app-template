import React, { memo } from 'react';
import { Card, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', ...shorthands.gap(tokens.spacingHorizontalM) },
  card: { ...shorthands.padding(tokens.spacingVerticalL) },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  value: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
});

function KpiCard({ label, value }) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>{value}</Text>
    </Card>
  );
}

function RccpKpiCards({ kpis }) {
  const styles = useStyles();
  if (!kpis) return null;
  return (
    <div className={styles.row}>
      <KpiCard label="Available capacity" value={kpis.totalAvailable} />
      <KpiCard label="Confirmed load" value={kpis.totalConfirmed} />
      <KpiCard label="Warning cells" value={kpis.warnings} />
      <KpiCard label="Overloaded / unplanned" value={kpis.overloaded} />
    </div>
  );
}

export default memo(RccpKpiCards);
