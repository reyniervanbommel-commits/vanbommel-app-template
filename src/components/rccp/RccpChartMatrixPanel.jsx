import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, Text, makeStyles, shorthands } from '@fluentui/react-components';
import RccpMatrixTable from './RccpMatrixTable';
import {
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  buildMatrixPeriodHeaders,
} from './rccpUtils';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 },
  chartCard: {
    ...shorthands.padding('12px', '16px', '4px'),
    minHeight: '240px',
    overflow: 'hidden',
  },
  chartCardCompact: {
    ...shorthands.padding('8px', '12px', '0'),
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  chartScroller: { overflowX: 'auto', width: '100%' },
  chartInner: { minWidth: 0 },
  chartArea: { flex: 1, minHeight: 0 },
  matrixWrap: { overflowX: 'auto', width: '100%' },
});

function RccpChartMatrixPanel({
  chart,
  measureRows,
  periods,
  cellMap,
  compact = false,
  chartHeight = 240,
  onCellClick,
  interactive = false,
}) {
  const styles = useStyles();
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);
  const gridWidth = RCCP_ROW_LABEL_WIDTH + periodHeaders.length * RCCP_WEEK_COL_WIDTH;

  const [visibleKeys, setVisibleKeys] = useState(() => (
    measureRows.reduce((acc, row) => {
      acc[row.measureKey] = row.showInChart !== false;
      return acc;
    }, {})
  ));

  const handleToggle = useCallback((measureKey, checked) => {
    setVisibleKeys((prev) => ({ ...prev, [measureKey]: checked }));
  }, []);

  const activeRows = useMemo(
    () => measureRows.filter((row) => visibleKeys[row.measureKey]),
    [measureRows, visibleKeys],
  );

  if (!periodHeaders.length) return null;

  const chartBody = (
    <div className={styles.chartScroller}>
      <div className={styles.chartInner} style={{ width: gridWidth, marginLeft: RCCP_ROW_LABEL_WIDTH }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" hide />
            <YAxis tick={{ fontSize: compact ? 11 : 12 }} width={42} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: compact ? '11px' : '12px' }} />
            {activeRows.map((row) => (
              row.chartType === 'bar' ? (
                <Bar
                  key={row.measureKey}
                  dataKey={row.measureKey}
                  name={row.label}
                  fill={row.color}
                  barSize={compact ? 10 : 14}
                />
              ) : (
                <Line
                  key={row.measureKey}
                  type="monotone"
                  dataKey={row.measureKey}
                  name={row.label}
                  stroke={row.color}
                  strokeWidth={2}
                  dot={false}
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className={styles.root}>
      <Card className={compact ? styles.chartCardCompact : styles.chartCard}>
        {!compact && <Text weight="semibold">Capacity vs load</Text>}
        {compact ? <div className={styles.chartArea}>{chartBody}</div> : chartBody}
      </Card>
      <div className={styles.matrixWrap}>
        <RccpMatrixTable
          measureRows={measureRows}
          periods={periods}
          cellMap={cellMap}
          visibleKeys={visibleKeys}
          onToggleVisible={handleToggle}
          onCellClick={onCellClick}
          interactive={interactive}
          compact={compact}
          gridWidth={gridWidth}
        />
      </div>
    </div>
  );
}

export { RCCP_CAPACITY_MEASURE_KEY };
export default memo(RccpChartMatrixPanel);
