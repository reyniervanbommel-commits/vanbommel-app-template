import React, { memo, useCallback } from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { PO_BOARD_CLICKABLE_KPI_KEYS } from '../../utils/poBoardKpis';
import KpiCard, { formatDays, formatItems, formatPct } from './RccpKpiCard';

const useStyles = makeStyles({
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
    alignItems: 'stretch',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
});

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
        qty={kpis.openLateUnits}
        hash
        aside={formatItems(kpis.openLateItemCount)}
        detail={formatDays(kpis.openLateAvgDays)}
        selected={selectedKey === 'openLate'}
        clickable={clickableSet.has('openLate')}
        onActivate={handleActivate}
      />
      <KpiCard
        kpiKey="planned1900"
        label="1-1-1900"
        qty={kpis.planned1900Units}
        hash
        aside={formatItems(kpis.planned1900ItemCount)}
        selected={selectedKey === 'planned1900'}
        clickable={clickableSet.has('planned1900')}
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
