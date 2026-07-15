import React, { memo } from 'react';
import { makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import ChartCard from './ChartCard';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
    ...shorthands.gap('16px'),
  },
  empty: {
    ...shorthands.padding('48px'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

function gridSpanStyle(span) {
  const safe = [1, 2, 3].includes(Number(span)) ? Number(span) : 1;
  return { gridColumn: `span ${Math.min(safe * 4, 12)}` };
}

function BiDashboardGrid({
  charts, resultsById, loading, currentUserId, columns, selectedChartId, onEdit, onDelete,
}) {
  const styles = useStyles();

  if (!charts.length) {
    return <div className={styles.empty}><Text>No charts yet. Create your first chart to get started.</Text></div>;
  }

  return (
    <div className={styles.grid}>
      {charts.map((chart) => (
        <div key={chart.id} style={gridSpanStyle(chart.config?.options?.gridSpan)}>
          <ChartCard
            chart={chart}
            series={resultsById[chart.id] || []}
            loading={loading}
            columns={columns}
            canManage={Number(chart.userId) === Number(currentUserId)}
            selected={Number(selectedChartId) === Number(chart.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(BiDashboardGrid);
