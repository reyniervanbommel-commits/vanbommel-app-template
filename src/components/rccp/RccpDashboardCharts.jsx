import React, { memo, useMemo } from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { resolveRccpDashboardKpis, shouldOfferRccpDataWindow } from './rccpUtils';
import { RCCP_CLICKABLE_KPI_KEYS } from './rccpKpiChartFilter';
import { useRccpKpiFilter } from './useRccpKpiFilter';
import RccpKpiCards from './RccpKpiCards';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpEmptyWindowCard from './RccpEmptyWindowCard';
import RccpMissingDateCard from './RccpMissingDateCard';
import RccpDiagnosticsCard from './RccpDiagnosticsCard';

const useStyles = makeStyles({
  error: { color: tokens.colorPaletteRedForeground1 },
});

function RccpDashboardCharts({
  loading, error, analysis, kpiWindowOnly, chart, matrix,
  visibility, interactive, onCellClick, onShowDataWindow,
}) {
  const styles = useStyles();
  const { selectedKey, onSelect, filteredChart, highlight } = useRccpKpiFilter(
    chart,
    matrix?.measureRows,
  );
  const kpis = resolveRccpDashboardKpis(analysis, kpiWindowOnly);
  const chartVisibility = useMemo(
    () => ({ ...(visibility || {}), kpiHighlight: highlight }),
    [visibility, highlight],
  );

  if (loading) return <Spinner label="Loading RCCP dashboard..." />;
  if (error) return <Text className={styles.error}>{error}</Text>;
  if (!analysis) return null;

  return (
    <>
      {shouldOfferRccpDataWindow(analysis) && (
        <RccpEmptyWindowCard dataWindow={analysis.dataWindow} onShow={onShowDataWindow} />
      )}
      <RccpKpiCards
        kpis={kpis}
        selectedKey={selectedKey || ''}
        onSelect={onSelect}
        clickableKeys={RCCP_CLICKABLE_KPI_KEYS}
      />
      <RccpChartMatrixPanel
        chart={filteredChart}
        measureRows={matrix?.measureRows}
        periods={matrix?.periods}
        cellMap={matrix?.cellMap}
        chartWeekRanges={analysis.config?.chartWeekRanges}
        onCellClick={onCellClick}
        interactive={interactive}
        visibility={chartVisibility}
      />
      {kpis?.totalOrdered === 0 && (
        <RccpDiagnosticsCard
          diagnostics={analysis.diagnostics}
          config={analysis.config}
          window={analysis.window}
        />
      )}
      <RccpMissingDateCard items={analysis.missingDates} />
    </>
  );
}

export default memo(RccpDashboardCharts);
