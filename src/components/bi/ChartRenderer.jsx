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

function truncateLabel(value, max = 18) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function axisLayout(data) {
  const maxLen = data.reduce((max, entry) => Math.max(max, String(entry.name ?? '').length), 0);
  if (maxLen > 24) return { angle: -55, textAnchor: 'end', height: 96, bottom: 24 };
  if (maxLen > 14) return { angle: -40, textAnchor: 'end', height: 72, bottom: 16 };
  if (maxLen > 8) return { angle: -25, textAnchor: 'end', height: 52, bottom: 12 };
  return { angle: 0, textAnchor: 'middle', height: 36, bottom: 8 };
}

function segmentColor(config, entry, index) {
  const colors = config?.options?.colors || {};
  return colors[entry?.name] || defaultColorForIndex(index);
}

function ChartRenderer({ type, series, config, columns = [], height = 260 }) {
  const styles = useStyles();
  const data = Array.isArray(series) ? series : [];
  const measureKeys = useMemo(() => resolveMeasures(config || {}), [config]);

  const effectiveMeasureKeys = useMemo(() => {
    if (!measureKeys.length) return ['value'];
    if (measureKeys.length === 1) {
      const key = measureKeys[0];
      const hasMeasureKey = data.some((row) => row[key] !== undefined);
      return hasMeasureKey ? [key] : ['value'];
    }
    return measureKeys;
  }, [measureKeys, data]);

  const xAxis = useMemo(() => axisLayout(data), [data]);
  const useSegmentColors = type === 'bar' && effectiveMeasureKeys.length === 1;

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

  const chartMargin = { top: 8, right: 16, bottom: xAxis.bottom, left: 0 };

  return (
    <div className={styles.root} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              angle={xAxis.angle}
              textAnchor={xAxis.textAnchor}
              height={xAxis.height}
              interval={0}
              tickFormatter={truncateLabel}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} labelFormatter={(label) => String(label)} />
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
            <Tooltip formatter={formatNumber} labelFormatter={(label) => String(label)} />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={segmentColor(config, entry, index)} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              angle={xAxis.angle}
              textAnchor={xAxis.textAnchor}
              height={xAxis.height}
              interval={0}
              tickFormatter={truncateLabel}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} labelFormatter={(label) => String(label)} />
            {effectiveMeasureKeys.length > 1 ? <Legend /> : null}
            {useSegmentColors ? (
              <Bar
                dataKey={effectiveMeasureKeys[0]}
                name={effectiveMeasureKeys[0] === 'value' ? 'Value' : measureLabel(effectiveMeasureKeys[0], columns)}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={segmentColor(config, entry, index)} />
                ))}
              </Bar>
            ) : effectiveMeasureKeys.map((key, index) => (
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
