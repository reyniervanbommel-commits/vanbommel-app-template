import React, { memo } from 'react';
import { makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import ChartCard from './ChartCard';
import { CHART_GRID_COLUMNS, chartGridStyle } from './biConstants';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${CHART_GRID_COLUMNS}, minmax(0, 1fr))`,
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalL,
    alignItems: 'start',
  },
  cell: {
    minWidth: 0,
    minHeight: 0,
    alignSelf: 'start',
  },
  empty: {
    ...shorthands.padding('48px'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

function BiDashboardGrid({
  charts, resultsById, loadingById, currentUserId, columns, selectedChartId, onEdit, onDelete,
}) {
  const styles = useStyles();

  if (!charts.length) {
    return <div className={styles.empty}><Text>No charts yet. Create your first chart to get started.</Text></div>;
  }

  return (
    <div className={styles.grid}>
      {charts.map((chart) => (
        <div key={chart.id} className={styles.cell} style={chartGridStyle(chart)}>
          <ChartCard
            chart={chart}
            series={resultsById[String(chart.id)] || []}
            loading={Boolean(loadingById[String(chart.id)]) && !(resultsById[String(chart.id)]?.length)}
            columns={columns}
            canManage={Number(chart.userId) === Number(currentUserId)}
            selected={String(selectedChartId) === String(chart.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(BiDashboardGrid);
