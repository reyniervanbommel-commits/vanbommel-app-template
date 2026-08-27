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
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  value: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    width: 'auto',
  },
  hash: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    width: 'auto',
  },
  aside: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    width: 'auto',
  },
  pct: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
  },
  detail: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function hasQty(value) {
  return value !== null && value !== undefined;
}

function formatQty(value) {
  if (!hasQty(value)) return '—';
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatPct(value) {
  if (!hasQty(value)) return '';
  return `${(Number(value) || 0).toFixed(1)}%`;
}

function formatDays(value) {
  if (!hasQty(value)) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return `Ø ${rounded} days late`;
}

function formatItems(value) {
  if (!hasQty(value)) return '';
  return `${formatQty(value)} items`;
}

function KpiCard({ kpiKey, label, qty, hash, aside, pct, detail, selected, clickable, onActivate }) {
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
  const mark = hash === true ? '#' : (typeof hash === 'string' ? hash : '');
  const showMark = Boolean(mark && hasQty(qty));
  const markBefore = mark === 'Ø';
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
      <div className={styles.valueRow}>
        {showMark && markBefore ? <Text className={styles.hash}>{mark}</Text> : null}
        <Text className={styles.value}>{formatQty(qty)}</Text>
        {showMark && !markBefore ? <Text className={styles.hash}>{mark}</Text> : null}
        {aside ? <Text className={styles.aside}>{aside}</Text> : null}
      </div>
      {pct ? <Text className={styles.pct}>{pct}</Text> : null}
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
  const uniqueLateItems = kpis.lateDeliveryItemCount;
  return (
    <div className={styles.row}>
      <KpiCard
        kpiKey="ordered"
        label="Total ordered"
        qty={kpis.totalOrdered}
        hash
        selected={selectedKey === 'ordered'}
        clickable={clickableSet.has('ordered')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="delivered"
        label="Total delivered"
        qty={kpis.totalDelivered}
        hash
        pct={formatPct(kpis.deliveredPercent)}
        selected={selectedKey === 'delivered'}
        clickable={clickableSet.has('delivered')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="open"
        label="Total open"
        qty={kpis.totalOpen}
        hash
        aside={formatItems(kpis.openItemCount)}
        pct={formatPct(kpis.openPercent)}
        selected={selectedKey === 'open'}
        clickable={clickableSet.has('open')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="lateDelivery"
        label="Late delivery"
        qty={kpis.lateDeliveryUnits}
        hash
        aside={formatItems(uniqueLateItems)}
        pct={formatPct(kpis.lateDeliveryPercent)}
        selected={selectedKey === 'lateDelivery'}
        clickable={clickableSet.has('lateDelivery')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="lateItems"
        label="Average days late"
        qty={kpis.lateDeliveryAvgDays}
        hash="Ø"
        aside="days late"
        selected={selectedKey === 'lateItems'}
        clickable={clickableSet.has('lateItems')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="onTime"
        label="On time delivery"
        qty={kpis.onTimeUnits}
        hash
        aside={formatItems(kpis.onTimeItemCount)}
        pct={formatPct(kpis.onTimePercent)}
        selected={selectedKey === 'onTime'}
        clickable={clickableSet.has('onTime')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="openLate"
        label="Open and late"
        qty={kpis.openLateItemCount}
        hash
        aside={formatItems(uniqueLateItems)}
        detail={formatDays(kpis.openLateAvgDays)}
        selected={selectedKey === 'openLate'}
        clickable={clickableSet.has('openLate')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="capacityShortfall"
        label="Capacity shortfall"
        qty={kpis.capacityShortfall}
        hash
        selected={false}
        clickable={false}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="overloadedWeeks"
        label="Overloaded weeks"
        qty={kpis.overloadedWeeks}
        hash
        selected={false}
        clickable={false}
        onActivate={handleActivate}
      />
    </div>
  );
}

export default memo(RccpKpiCards);
