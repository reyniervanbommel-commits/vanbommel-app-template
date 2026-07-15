import React, { memo } from 'react';
import { makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import ChartCard from './ChartCard';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    ...shorthands.gap('16px'),
  },
  empty: {
    ...shorthands.padding('48px'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

function BiDashboardGrid({ charts, resultsById, loading, currentUserId, onEdit, onDelete }) {
  const styles = useStyles();

  if (!charts.length) {
    return <div className={styles.empty}><Text>No charts yet. Create your first chart to get started.</Text></div>;
  }

  return (
    <div className={styles.grid}>
      {charts.map((chart) => (
        <ChartCard
          key={chart.id}
          chart={chart}
          series={resultsById[chart.id] || []}
          loading={loading}
          canManage={Number(chart.userId) === Number(currentUserId)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default memo(BiDashboardGrid);
