import React, { memo } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// Herbruikbare recharts-wrapper voor bar/line/pie/kpi. Kleuren via Fluent-tokens (geen hardcoded hex),
// zodat de grafieken automatisch meebewegen met light/dark theme. React.memo omdat dit component
// vaak in een grid herhaald wordt en zware SVG's tekent.

const PALETTE = [
  tokens.colorBrandBackground,
  tokens.colorPaletteGreenForeground1,
  tokens.colorPalettePurpleForeground2,
  tokens.colorPaletteYellowForeground1,
  tokens.colorPaletteTealForeground2,
  tokens.colorPaletteRedForeground1,
  tokens.colorPaletteMarigoldForeground1,
  tokens.colorPaletteBlueForeground2,
];

const useStyles = makeStyles({
  root: { width: '100%', height: '100%', minHeight: 0 },
  kpi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  kpiValue: { fontSize: '40px', fontWeight: 700, color: tokens.colorBrandForeground1, lineHeight: 1.1 },
  kpiLabel: { color: tokens.colorNeutralForeground3, marginTop: '4px' },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
});

function formatNumber(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('nl-NL', { maximumFractionDigits: 2 });
}

function ChartRenderer({ type, series, height = 260 }) {
  const styles = useStyles();
  const data = Array.isArray(series) ? series : [];

  if (!data.length) {
    return <div className={styles.empty} style={{ height }}><Text>No data</Text></div>;
  }

  if (type === 'kpi') {
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    return (
      <div className={styles.kpi} style={{ height }}>
        <span className={styles.kpiValue}>{formatNumber(total)}</span>
        <Text className={styles.kpiLabel}>{data.length === 1 ? data[0].name : 'Total'}</Text>
      </div>
    );
  }

  return (
    <div className={styles.root} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} />
            <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Tooltip formatter={formatNumber} />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} />
            <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ChartRenderer);
