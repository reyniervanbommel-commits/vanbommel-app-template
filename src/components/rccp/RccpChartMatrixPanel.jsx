import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, ReferenceLine,
} from 'recharts';
import { Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import RccpMatrixTable from './RccpMatrixTable';
import RccpWeekBandCursor from './RccpWeekBandCursor';
import {
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  resolveChartWeekRangeBounds,
} from './rccpUtils';

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
  chartWeekRanges = [],
  compact = false,
  chartHeight = 240,
  onCellClick,
  interactive = false,
}) {
  const styles = useStyles();
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);
  const gridWidth = useMemo(
    () => measureRows.length && periodHeaders.length
      ? RCCP_ROW_LABEL_WIDTH + periodHeaders.length * RCCP_WEEK_COL_WIDTH
      : 0,
    [measureRows.length, periodHeaders.length],
  );
  const chartRangeBands = useMemo(
    () => (chartWeekRanges || [])
      .map((range) => resolveChartWeekRangeBounds(range, periods))
      .filter(Boolean),
    [chartWeekRanges, periods],
  );
  const plotWidth = periodHeaders.length * RCCP_WEEK_COL_WIDTH;
  const chartWidth = RCCP_CHART_Y_AXIS_WIDTH + plotWidth;
  const weekBoundaryCoordinates = useMemo(
    () => buildRccpChartWeekBoundaryCoordinates(periodHeaders.length),
    [periodHeaders.length],
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
        <div
          style={{
            marginLeft: RCCP_ROW_LABEL_WIDTH - RCCP_CHART_Y_AXIS_WIDTH,
            width: chartWidth,
            height: chartHeight,
          }}
        >
          <ComposedChart
            width={chartWidth}
            height={chartHeight}
            data={chart}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
              <CartesianGrid
                stroke={tokens.colorNeutralStroke2}
                strokeDasharray="4 4"
                verticalCoordinatesGenerator={weekBoundaryCoordinates}
              />
              <XAxis dataKey="key" scale="band" padding={{ left: 0, right: 0 }} hide />
              <YAxis tick={{ fontSize: compact ? 11 : 12 }} width={RCCP_CHART_Y_AXIS_WIDTH} />
              {/* Nullijn: bij een capaciteitstekort duikt de overcapaciteit-lijn hieronder. */}
              <ReferenceLine y={0} stroke={tokens.colorNeutralStroke1} strokeWidth={1} />
              <Tooltip shared cursor={<RccpWeekBandCursor />} />
              <Legend wrapperStyle={{ fontSize: compact ? '11px' : '12px' }} />
              {chartRangeBands.map((band, index) => (
                <ReferenceArea
                  key={`${band.x1}-${band.x2}-${index}`}
                  x1={band.x1}
                  x2={band.x2}
                  fill={band.color}
                  fillOpacity={0.22}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
              ))}
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
