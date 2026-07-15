import React, { memo, useMemo } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  defaultColorForIndex, resolveChartColor, resolveMeasures,
} from './biConstants';

const useStyles = makeStyles({
  root: { width: '100%', height: '100%', minHeight: 0 },
  kpi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  kpiValue: { fontSize: '40px', fontWeight: 700, lineHeight: 1.1 },
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

function measureLabel(key, columns) {
  return columns?.find((col) => col.key === key)?.label || key;
}

function ChartRenderer({ type, series, config, columns = [], height = 260 }) {
  const styles = useStyles();
  const data = Array.isArray(series) ? series : [];
  const measureKeys = useMemo(() => resolveMeasures(config || {}), [config]);
  const colors = config?.options?.colors || {};

  const effectiveMeasureKeys = useMemo(() => {
    if (!measureKeys.length) return ['value'];
    if (measureKeys.length === 1) {
      const key = measureKeys[0];
      const hasMeasureKey = data.some((row) => row[key] !== undefined);
      return hasMeasureKey ? [key] : ['value'];
    }
    return measureKeys;
  }, [measureKeys, data]);

  if (!data.length) {
    return <div className={styles.empty} style={{ height }}><Text>No data</Text></div>;
  }

  if (type === 'kpi') {
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const colorKey = measureKeys[0] || 'value';
    const kpiColor = resolveChartColor(config, colorKey, 0);
    return (
      <div className={styles.kpi} style={{ height }}>
        <span className={styles.kpiValue} style={{ color: kpiColor }}>{formatNumber(total)}</span>
        <Text className={styles.kpiLabel}>{data.length === 1 ? data[0].name : 'Total'}</Text>
      </div>
    );
  }

  const pieColor = (entry, index) => colors[entry?.name] || defaultColorForIndex(index);

  return (
    <div className={styles.root} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} />
            {effectiveMeasureKeys.length > 1 ? <Legend /> : null}
            {effectiveMeasureKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key === 'value' ? 'Value' : measureLabel(key, columns)}
                stroke={resolveChartColor(config, measureKeys[index] || key, index)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Tooltip formatter={formatNumber} />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={pieColor(entry, index)} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} />
            {effectiveMeasureKeys.length > 1 ? <Legend /> : null}
            {effectiveMeasureKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={key === 'value' ? 'Value' : measureLabel(key, columns)}
                fill={resolveChartColor(config, measureKeys[index] || key, index)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ChartRenderer);
