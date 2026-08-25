import React, { memo } from 'react';
import { Card, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  card: {
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  value: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  detail: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function formatQty(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatPct(value) {
  return `${Math.round(Number(value) || 0)}% of ordered`;
}

function formatDays(value) {
  if (value === null || value === undefined) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${rounded} days late`;
}

function KpiCard({ label, value, detail }) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>{value}</Text>
      {detail ? <Text className={styles.detail}>{detail}</Text> : null}
    </Card>
  );
}

function RccpKpiCards({ kpis }) {
  const styles = useStyles();
  if (!kpis) return null;
  return (
    <div className={styles.row}>
      <KpiCard label="Total ordered" value={formatQty(kpis.totalOrdered)} />
      <KpiCard
        label="Total delivered"
        value={formatQty(kpis.totalDelivered)}
        detail={formatPct(kpis.deliveredPercent)}
      />
      <KpiCard
        label="Total open"
        value={formatQty(kpis.totalOpen)}
        detail={formatPct(kpis.openPercent)}
      />
      <KpiCard label="Late delivery" value={formatDays(kpis.lateDeliveryAvgDays)} />
      <KpiCard label="Late delivery items" value={formatQty(kpis.lateDeliveryItemCount)} />
      <KpiCard
        label="Open and late"
        value={formatQty(kpis.openLateItemCount)}
        detail={formatDays(kpis.openLateAvgDays)}
      />
      <KpiCard label="Capacity shortfall" value={formatQty(kpis.capacityShortfall)} />
      <KpiCard label="Overloaded weeks" value={formatQty(kpis.overloadedWeeks)} />
    </div>
  );
}

export default memo(RccpKpiCards);
