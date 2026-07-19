import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import RccpMatrixTable from './RccpMatrixTable';
import { buildMatrixPeriodHeaders, RCCP_ROW_LABEL_WIDTH } from './rccpUtils';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 },
  chartCard: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL, '0'),
    minHeight: '240px',
    overflow: 'hidden',
  },
  chartCardCompact: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM, '0'),
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  scroller: { overflowX: 'auto', width: '100%' },
  alignedBlock: { minWidth: 0 },
  chartArea: { flex: 1, minHeight: 0 },
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
  const gridWidth = useMemo(
    () => measureRows.length && periodHeaders.length
      ? RCCP_ROW_LABEL_WIDTH + periodHeaders.length * 72
      : 0,
    [measureRows.length, periodHeaders.length],
  );

  const [visibleKeys, setVisibleKeys] = useState({});

  useEffect(() => {
    setVisibleKeys(measureRows.reduce((acc, row) => {
      acc[row.measureKey] = row.showInChart !== false;
      return acc;
    }, {}));
  }, [measureRows]);

  const handleToggle = useCallback((measureKey, checked) => {
    setVisibleKeys((prev) => ({ ...prev, [measureKey]: checked }));
  }, []);

  const activeRows = useMemo(
    () => measureRows.filter((row) => visibleKeys[row.measureKey]),
    [measureRows, visibleKeys],
  );

  if (!periodHeaders.length) return null;

  const alignedContent = (
    <div className={styles.scroller}>
      <div className={styles.alignedBlock} style={{ width: gridWidth }}>
        <div style={{ marginLeft: RCCP_ROW_LABEL_WIDTH, height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
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

  return (
    <div className={styles.root}>
      <Card className={compact ? styles.chartCardCompact : styles.chartCard}>
        {!compact && <Text weight="semibold">Capacity vs load</Text>}
        {compact ? <div className={styles.chartArea}>{alignedContent}</div> : alignedContent}
      </Card>
    </div>
  );
}

export default memo(RccpChartMatrixPanel);
