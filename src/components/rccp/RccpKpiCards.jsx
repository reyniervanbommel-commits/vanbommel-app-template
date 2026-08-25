import React, { memo, useCallback } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens, shorthands } from '@fluentui/react-components';
import { PO_BOARD_CLICKABLE_KPI_KEYS } from '../../utils/poBoardKpis';

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
  clickable: { cursor: 'pointer' },
  selected: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
  },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  value: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  detail: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function formatQty(value) {
  if (value === null || value === undefined) return '—';
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatPct(value) {
  if (value === null || value === undefined) return '';
  return `${(Number(value) || 0).toFixed(1)}% of ordered`;
}

function formatDays(value) {
  if (value === null || value === undefined) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${rounded} days late`;
}

function KpiCard({ kpiKey, label, value, detail, selected, clickable, onActivate }) {
  const styles = useStyles();
  const handleClick = useCallback(() => {
    if (clickable) onActivate(kpiKey);
  }, [clickable, kpiKey, onActivate]);
  const handleKeyDown = useCallback((event) => {
    if (!clickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(kpiKey);
    }
  }, [clickable, kpiKey, onActivate]);
  return (
    <Card
      className={mergeClasses(styles.card, clickable && styles.clickable, selected && styles.selected)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? selected : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>{value}</Text>
      {detail ? <Text className={styles.detail}>{detail}</Text> : null}
    </Card>
  );
}

function RccpKpiCards({ kpis, selectedKey = '', onSelect }) {
  const styles = useStyles();
  const handleActivate = useCallback((key) => {
    onSelect?.(key);
  }, [onSelect]);
  if (!kpis) return null;
  const clickable = Boolean(onSelect);
  const clickableSet = clickable ? new Set(PO_BOARD_CLICKABLE_KPI_KEYS) : new Set();
  return (
    <div className={styles.row}>
      <KpiCard
        kpiKey="ordered"
        label="Total ordered"
        value={formatQty(kpis.totalOrdered)}
        selected={selectedKey === 'ordered'}
        clickable={clickableSet.has('ordered')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="delivered"
        label="Total delivered"
        value={formatQty(kpis.totalDelivered)}
        detail={formatPct(kpis.deliveredPercent)}
        selected={selectedKey === 'delivered'}
        clickable={clickableSet.has('delivered')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="open"
        label="Total open"
        value={formatQty(kpis.totalOpen)}
        detail={formatPct(kpis.openPercent)}
        selected={selectedKey === 'open'}
        clickable={clickableSet.has('open')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="lateDelivery"
        label="Late delivery"
        value={formatDays(kpis.lateDeliveryAvgDays)}
        selected={selectedKey === 'lateDelivery'}
        clickable={clickableSet.has('lateDelivery')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="lateItems"
        label="Late delivery items"
        value={formatQty(kpis.lateDeliveryItemCount)}
        selected={selectedKey === 'lateItems'}
        clickable={clickableSet.has('lateItems')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="openLate"
        label="Open and late"
        value={formatQty(kpis.openLateItemCount)}
        detail={formatDays(kpis.openLateAvgDays)}
        selected={selectedKey === 'openLate'}
        clickable={clickableSet.has('openLate')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="capacityShortfall"
        label="Capacity shortfall"
        value={formatQty(kpis.capacityShortfall)}
        selected={false}
        clickable={false}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="overloadedWeeks"
        label="Overloaded weeks"
        value={formatQty(kpis.overloadedWeeks)}
        selected={false}
        clickable={false}
        onActivate={handleActivate}
      />
    </div>
  );
}

export default memo(RccpKpiCards);
