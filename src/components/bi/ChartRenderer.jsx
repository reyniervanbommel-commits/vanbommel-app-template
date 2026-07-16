import React, { memo, useMemo } from 'react';
import { makeStyles, shorthands, tokens, Text } from '@fluentui/react-components';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import ChartAxisTick from './ChartAxisTick';
import {
  COLOR_MODE_RANDOM, defaultColorForIndex, MEASURE_STYLE_LINE, resolveChartColor, resolveColorMode,
  resolveMeasureStyle, resolveMeasures, resolveSingleColor, resolveValueDisplay, SERIES_COLOR_KEY,
  VALUE_DISPLAY_PERCENT,
} from './biConstants';

const useStyles = makeStyles({
  root: { width: '100%', height: '100%', minHeight: 0 },
  kpi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding('4px'),
  },
  kpiValue: { fontSize: '26px', fontWeight: 700, lineHeight: 1.1 },
  kpiUnit: { fontSize: '11px', color: tokens.colorNeutralForeground3, marginTop: '2px' },
  kpiLabel: { fontSize: '10px', color: tokens.colorNeutralForeground3, marginTop: '2px' },
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

function segmentColor(config, entry, index) {
  if (resolveColorMode(config) === COLOR_MODE_RANDOM) {
    return defaultColorForIndex(index);
  }
  const colors = config?.options?.colors || {};
  return colors[entry?.name] || resolveSingleColor(config) || defaultColorForIndex(index);
}

function seriesStrokeColor(config, index = 0) {
  if (resolveColorMode(config) === COLOR_MODE_RANDOM) {
    return defaultColorForIndex(index);
  }
  const colors = config?.options?.colors || {};
  if (colors[SERIES_COLOR_KEY]) return colors[SERIES_COLOR_KEY];
  const measureKeys = resolveMeasures(config || {});
  return resolveChartColor(config, measureKeys[index] || 'value', index);
}

function seriesTotal(data, dataKey) {
  return data.reduce((sum, row) => sum + (Number(row[dataKey]) || 0), 0);
}

function formatDisplayValue(value, total, config) {
  if (resolveValueDisplay(config) === VALUE_DISPLAY_PERCENT) {
    if (!total) return '0%';
    return `${((Number(value) / total) * 100).toFixed(1)}%`;
  }
  return formatNumber(value);
}

function ChartRenderer({ type, series, config, columns = [], height = 260 }) {
  const styles = useStyles();
  const data = Array.isArray(series) ? series : [];
  const measureKeys = useMemo(() => resolveMeasures(config || {}), [config]);
  const showPercent = resolveValueDisplay(config) === VALUE_DISPLAY_PERCENT;

  const effectiveMeasureKeys = useMemo(() => {
    if (!measureKeys.length) return ['value'];
    if (measureKeys.length === 1) {
      const key = measureKeys[0];
      const hasMeasureKey = data.some((row) => row[key] !== undefined);
      return hasMeasureKey ? [key] : ['value'];
    }
    return measureKeys;
  }, [measureKeys, data]);

  const useSegmentColors = (type === 'bar' || type === 'line') && effectiveMeasureKeys.length === 1;
  const chartMargin = { top: showPercent ? 20 : 8, right: 16, bottom: 32, left: 0 };
  const xAxisProps = {
    dataKey: 'name',
    interval: 0,
    height: 36,
    tick: <ChartAxisTick />,
  };

  const labelFormatter = useMemo(() => {
    const primaryKey = effectiveMeasureKeys[0] || 'value';
    const total = seriesTotal(data, primaryKey);
    return (value) => formatDisplayValue(value, total, config);
  }, [data, effectiveMeasureKeys, config]);

  const lineDot = useMemo(() => {
    if (!useSegmentColors || type !== 'line') return false;
    return (dotProps) => {
      const { cx, cy, payload, index: dotIndex } = dotProps;
      if (cx == null || cy == null) return null;
      return (
        <circle
          key={`${payload?.name}-${dotIndex}`}
          cx={cx}
          cy={cy}
          r={4}
          fill={segmentColor(config, payload, dotIndex)}
        />
      );
    };
  }, [useSegmentColors, type, config]);

  if (!data.length) {
    return <div className={styles.empty} style={{ height }}><Text>No data</Text></div>;
  }

  if (type === 'kpi') {
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const colorKey = measureKeys[0] || 'value';
    const kpiColor = resolveChartColor(config, colorKey, 0);
    const kpiLabel = measureLabel(colorKey, columns) || 'Total';
    const unit = String(config?.options?.unit || '').trim();
    return (
      <div className={styles.kpi} style={{ height }}>
        <span className={styles.kpiValue} style={{ color: kpiColor }}>{formatNumber(total)}</span>
        {unit ? <Text className={styles.kpiUnit}>{unit}</Text> : null}
        <Text className={styles.kpiLabel}>{kpiLabel}</Text>
      </div>
    );
  }

  const pieTotal = seriesTotal(data, 'value');

  const renderBarSeries = () => {
    if (useSegmentColors) {
      return (
        <Bar
          dataKey={effectiveMeasureKeys[0]}
          name={effectiveMeasureKeys[0] === 'value' ? 'Value' : measureLabel(effectiveMeasureKeys[0], columns)}
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={segmentColor(config, entry, index)} />
          ))}
          <LabelList dataKey={effectiveMeasureKeys[0]} position="top" formatter={labelFormatter} style={{ fontSize: 10 }} />
        </Bar>
      );
    }

    return effectiveMeasureKeys.map((key, index) => {
      const color = resolveChartColor(config, measureKeys[index] || key, index);
      const label = key === 'value' ? 'Value' : measureLabel(key, columns);
      const style = resolveMeasureStyle(config, key);

      if (style === MEASURE_STYLE_LINE) {
        return (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
          >
            <LabelList dataKey={key} position="top" formatter={labelFormatter} style={{ fontSize: 10 }} />
          </Line>
        );
      }

      return (
        <Bar
          key={key}
          dataKey={key}
          name={label}
          fill={color}
          radius={[4, 4, 0, 0]}
        >
          <LabelList dataKey={key} position="top" formatter={labelFormatter} style={{ fontSize: 10 }} />
        </Bar>
      );
    });
  };

  const barChartBody = (ChartComponent) => (
    <ChartComponent data={data} margin={chartMargin}>
      <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
      <XAxis {...xAxisProps} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip formatter={formatNumber} labelFormatter={(label) => String(label)} />
      {effectiveMeasureKeys.length > 1 ? <Legend /> : null}
      {renderBarSeries()}
    </ChartComponent>
  );

  return (
    <div className={styles.root} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
            <XAxis {...xAxisProps} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={formatNumber} labelFormatter={(label) => String(label)} />
            {effectiveMeasureKeys.length > 1 ? <Legend /> : null}
            {effectiveMeasureKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key === 'value' ? 'Value' : measureLabel(key, columns)}
                stroke={useSegmentColors ? seriesStrokeColor(config, index) : resolveChartColor(config, measureKeys[index] || key, index)}
                strokeWidth={2}
                dot={lineDot}
              >
                <LabelList dataKey={key} position="top" formatter={labelFormatter} style={{ fontSize: 10 }} />
              </Line>
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
              <LabelList dataKey="value" formatter={(value) => formatDisplayValue(value, pieTotal, config)} style={{ fontSize: 10 }} />
            </Pie>
          </PieChart>
        ) : (
          barChartBody(
            effectiveMeasureKeys.length > 1 && effectiveMeasureKeys.some(
              (key) => resolveMeasureStyle(config, key) === MEASURE_STYLE_LINE,
            )
              ? ComposedChart
              : BarChart,
          )
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ChartRenderer);
