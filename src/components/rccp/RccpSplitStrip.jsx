import React, { memo, useMemo } from 'react';
import {
  Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import { filterRccpChartByItem, filterRccpMatrixByItem } from './rccpChartItems';
import {
  parseRccpPeriodGrain,
  resolveRccpChartView,
} from './rccpPeriodGrain';
import { resolveRccpItemsFromFilter } from './resolveRccpItemFilter';
import { useRccpSplitAnalysis } from '../../hooks/useRccpSplitAnalysis';

export const RCCP_SPLIT_CHART_HEIGHT = 180;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    minHeight: 0,
    height: '100%',
    width: '100%',
  },
  body: { flex: 1, minHeight: 0, overflow: 'hidden' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function RccpSplitStrip({
  vendorAccount, refreshKey, enabled, isoWindow, filterByColumn, itemColumnKey, onItemClick,
  planningDateMode, periodGrain: periodGrainProp,
}) {
  const styles = useStyles();
  const periodGrain = parseRccpPeriodGrain(periodGrainProp);

  const {
    analysis, loading, error, measureRows, periods, chart, chartWeekRanges,
  } = useRccpSplitAnalysis({
    vendorAccount,
    isoWindow,
    enabled,
    refreshKey,
    planningDateMode,
  });

  const chartView = useMemo(() => resolveRccpChartView({
    grain: periodGrain,
    periods,
    chart,
    cells: analysis?.cells,
  }), [periodGrain, periods, chart, analysis?.cells]);

  const itemFilter = useMemo(
    () => resolveRccpItemsFromFilter(filterByColumn, undefined, itemColumnKey),
    [filterByColumn, itemColumnKey],
  );
  const filteredChart = useMemo(
    () => filterRccpChartByItem(chartView.chart, itemFilter.items, {
      emptyHidesAll: itemFilter.active,
      containsTerm: itemFilter.containsTerm,
      measureRows,
    }),
    [chartView.chart, itemFilter, measureRows],
  );
  const filteredCellMap = useMemo(
    () => filterRccpMatrixByItem(chartView.cellMap, {
      chart: filteredChart,
      measureRows,
      active: itemFilter.active,
    }),
    [chartView.cellMap, filteredChart, measureRows, itemFilter],
  );
  const focusItem = itemFilter.items.length === 1 ? itemFilter.items[0] : '';
  const itemFocus = useMemo(
    () => ({ item: focusItem, onSelect: onItemClick }),
    [focusItem, onItemClick],
  );

  return (
    <div className={styles.root}>
      {loading && !analysis && <Spinner size="tiny" label="Loading RCCP…" />}
      {error && <Text className={styles.error}>{error}</Text>}

      {analysis && !error && (
        <div className={styles.body}>
          <RccpChartMatrixPanel
            chart={filteredChart}
            measureRows={measureRows}
            periods={chartView.periods}
            cellMap={filteredCellMap}
            chartWeekRanges={chartWeekRanges}
            compact
            chartHeight={RCCP_SPLIT_CHART_HEIGHT}
            itemFocus={itemFocus}
          />
        </div>
      )}
    </div>
  );
}

export default memo(RccpSplitStrip);
