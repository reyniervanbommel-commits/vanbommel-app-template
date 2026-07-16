import React, { memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, Text, makeStyles, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: { ...shorthands.padding('16px'), minHeight: '280px' },
  cardCompact: {
    ...shorthands.padding('8px', '12px'),
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  chartArea: { flex: 1, minHeight: 0, width: '100%' },
});

function RccpChart({ chart, chartHeight = 240, compact = false }) {
  const styles = useStyles();
  if (!chart?.length) return null;

  if (compact) {
    return (
      <Card className={styles.cardCompact}>
        <Text weight="semibold">Capacity vs confirmed load</Text>
        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="available" name="Available" stroke="#107C10" strokeWidth={2} />
              <Line type="monotone" dataKey="confirmed" name="Confirmed" stroke="#D13438" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <Text weight="semibold">Capacity vs confirmed load</Text>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="key" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="available" name="Available" stroke="#107C10" strokeWidth={2} />
          <Line type="monotone" dataKey="confirmed" name="Confirmed" stroke="#D13438" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default memo(RccpChart);
