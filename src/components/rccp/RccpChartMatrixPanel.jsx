import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import RccpMatrixTable from './RccpMatrixTable';
import { RccpPoSegmentHoverCard } from './RccpPoSegmentTooltip';
import RccpChartPlot from './RccpChartPlot';
import { RccpSegmentHoverContext } from './RccpPoStackBar';
import { getRgbHex } from '../../utils/hexColor';
import { todayLineX } from './rccpPoStack';
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
    overflow: 'visible',
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

function isStackRow(row) {
  return Boolean(row?.isOpen || row?.isDelivered);
}

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
  const [hoveredSegment, setHoveredSegment] = useState(null);

  useEffect(() => {
    setVisibleKeys(measureRows.reduce((acc, row) => {
      acc[row.measureKey] = row.showInChart !== false;
      return acc;
    }, {}));
  }, [measureRows]);

  const handleToggle = useCallback((measureKey, checked) => {
    setVisibleKeys((prev) => ({ ...prev, [measureKey]: checked }));
  }, []);
  const handleSegmentHover = useCallback((next) => {
    setHoveredSegment(next);
  }, []);

  const openRow = useMemo(() => measureRows.find((row) => row.isOpen), [measureRows]);
  const deliveredRow = useMemo(() => measureRows.find((row) => row.isDelivered), [measureRows]);
  const receivedColor = useMemo(
    () => getRgbHex(deliveredRow?.color) || '#0078D4',
    [deliveredRow],
  );
  const openColor = useMemo(
    () => getRgbHex(openRow?.color) || receivedColor,
    [openRow, receivedColor],
  );
  const openVisible = Boolean(openRow && visibleKeys[openRow.measureKey]);
  const deliveredVisible = Boolean(deliveredRow && visibleKeys[deliveredRow.measureKey]);

  const chartRows = useMemo(() => (chart || []).map((point) => {
    const segmentsAbove = (point.segmentsAbove || []).filter((seg) => (
      (seg.status === 'open' && openVisible) || (seg.status === 'received' && deliveredVisible)
    ));
    const segmentsBelow = deliveredVisible ? (point.segmentsBelow || []) : [];
    return {
      ...point,
      segmentsAbove,
      segmentsBelow,
      __stackAbove: segmentsAbove.reduce((sum, seg) => sum + seg.qty, 0),
      __stackBelow: -segmentsBelow.reduce((sum, seg) => sum + seg.qty, 0),
      __openColor: openColor,
      __receivedColor: receivedColor,
    };
  }), [chart, openVisible, deliveredVisible, openColor, receivedColor]);

  const todayX = useMemo(() => todayLineX(periodHeaders), [periodHeaders]);
  const activeRows = useMemo(
    () => measureRows.filter((row) => visibleKeys[row.measureKey] && !isStackRow(row)),
    [measureRows, visibleKeys],
  );
  const seriesSignature = useMemo(
    () => `${activeRows.map((row) => `${row.measureKey}:${row.chartType}`).join('|')}|${openVisible}|${deliveredVisible}`,
    [activeRows, openVisible, deliveredVisible],
  );
  const plot = useMemo(() => ({
    data: chartRows,
    width: chartWidth,
    height: chartHeight,
    compact,
    weekBoundaryCoordinates,
    chartRangeBands,
    activeRows,
  }), [chartRows, chartWidth, chartHeight, compact, weekBoundaryCoordinates, chartRangeBands, activeRows]);
  const stack = useMemo(() => ({
    openVisible, deliveredVisible, openRow, deliveredRow, receivedColor,
  }), [openVisible, deliveredVisible, openRow, deliveredRow, receivedColor]);

  if (!periodHeaders.length) return null;

  const alignedContent = (
    <div className={styles.scroller}>
      <div className={styles.alignedBlock} style={{ width: gridWidth }}>
        <div
          key={seriesSignature}
          style={{ marginLeft: RCCP_ROW_LABEL_WIDTH - RCCP_CHART_Y_AXIS_WIDTH }}
        >
          <RccpSegmentHoverContext.Provider value={handleSegmentHover}>
            <RccpChartPlot
              plot={plot}
              stack={stack}
              todayX={todayX}
            />
          </RccpSegmentHoverContext.Provider>
          <RccpPoSegmentHoverCard hover={hoveredSegment} />
        </div>
        <RccpMatrixTable
          measureRows={measureRows.filter((r) => !r.isWarning)}
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
