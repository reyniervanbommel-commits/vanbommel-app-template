import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpLoadDateToggle from './RccpLoadDateToggle';
import { filterRccpChartByItem, filterRccpMatrixByItem } from './rccpChartItems';
import { formatIsoWindowLabel } from './rccpUtils';
import { resolveRccpItemsFromFilter } from './resolveRccpItemFilter';
import { useRccpSplitAnalysis } from '../../hooks/useRccpSplitAnalysis';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    minHeight: 0,
    height: '100%',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    flexWrap: 'wrap',
  },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  body: { flex: 1, minHeight: 0, overflow: 'hidden' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function RccpSplitStrip({
  vendorAccount, refreshKey, height, enabled, isoWindow, filterByColumn, itemColumnKey, onItemClick,
  planningDateMode, onPlanningDateModeChange,
}) {
  const styles = useStyles();
  const windowLabel = useMemo(() => formatIsoWindowLabel(isoWindow), [isoWindow]);
  const chartHeight = Math.max(120, (height || 280) - 72);

  const {
    analysis, loading, error, measureRows, periods, cellMap, chart, chartWeekRanges,
  } = useRccpSplitAnalysis({
    vendorAccount,
    isoWindow,
    enabled,
    refreshKey,
    planningDateMode,
  });

  const itemFilter = useMemo(
    () => resolveRccpItemsFromFilter(filterByColumn, undefined, itemColumnKey),
    [filterByColumn, itemColumnKey],
  );
  const filteredChart = useMemo(
    () => filterRccpChartByItem(chart, itemFilter.items, {
      emptyHidesAll: itemFilter.active,
      containsTerm: itemFilter.containsTerm,
    }),
    [chart, itemFilter],
  );
  const filteredCellMap = useMemo(
    () => filterRccpMatrixByItem(cellMap, {
      chart: filteredChart,
      measureRows,
      active: itemFilter.active,
    }),
    [cellMap, filteredChart, measureRows, itemFilter],
  );
  const focusItem = itemFilter.items.length === 1 ? itemFilter.items[0] : '';
  const itemFocus = useMemo(
    () => ({ item: focusItem, onSelect: onItemClick }),
    [focusItem, onItemClick],
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.meta}>
          {windowLabel ? `Week range: ${windowLabel}` : 'Set week range on the RCCP page'}
          {vendorAccount ? ` · Vendor: ${vendorAccount}` : ' · All vendors'}
        </Text>
        <div className={styles.headerActions}>
          <RccpLoadDateToggle
            value={planningDateMode}
            onChange={onPlanningDateModeChange}
            confirmedPercent={analysis?.kpis?.confirmedPercent}
          />
          <Button
            as={Link}
            to="/rccp"
            size="small"
            appearance="subtle"
            icon={<ArrowRightRegular />}
            iconPosition="after"
          >
            Open RCCP page
          </Button>
        </div>
      </div>

      {loading && !analysis && <Spinner size="tiny" label="Loading RCCP…" />}
      {error && <Text className={styles.error}>{error}</Text>}

      {analysis && !error && (
        <div className={styles.body}>
          <RccpChartMatrixPanel
            chart={filteredChart}
            measureRows={measureRows}
            periods={periods}
            cellMap={filteredCellMap}
            chartWeekRanges={chartWeekRanges}
            compact
            chartHeight={chartHeight}
            itemFocus={itemFocus}
          />
        </div>
      )}
    </div>
  );
}

export default memo(RccpSplitStrip);
