import React, { memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, Text, makeStyles, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: { ...shorthands.padding('16px'), minHeight: '280px' },
});

function RccpChart({ chart }) {
  const styles = useStyles();
  if (!chart?.length) return null;
  return (
    <Card className={styles.card}>
      <Text weight="semibold">Capacity vs confirmed load</Text>
      <ResponsiveContainer width="100%" height={240}>
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
