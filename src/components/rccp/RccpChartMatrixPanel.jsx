import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import RccpMatrixTable from './RccpMatrixTable';
import {
  RccpPoSegmentHoverCard,
  firstChartDataAreaId,
  isSameRccpHover,
} from './RccpPoSegmentTooltip';
import RccpChartPlot from './RccpChartPlot';
import { RccpSegmentHoverContext } from './RccpPoStackBar';
import { getRgbHex } from '../../utils/hexColor';
import { todayBand } from './rccpPoStack';
import { buildRccpChartRows } from './rccpChartStacks';
import {
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  resolveChartWeekRangeBounds,
} from './rccpUtils';
import { mergeChartVisibleKeys, sortRccpMatrixRows } from './rccpMatrixRows';
import RccpLinkedHScroll from './RccpLinkedHScroll';

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
  chartArea: { flex: 1, minHeight: 0 },
  chartHeader: {
    ...shorthands.padding(0, 0, tokens.spacingVerticalS),
  },
});

function isStackRow(row) {
  return Boolean(row?.isOpen || row?.isDelivered || row?.isConfirmedDelivery);
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
  visibility = null,
}) {
  const styles = useStyles();
  const orderedRows = useMemo(() => sortRccpMatrixRows(measureRows), [measureRows]);
  const matrixRows = useMemo(
    () => orderedRows.filter((row) => !row.isWarning),
    [orderedRows],
  );
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);
  const gridWidth = useMemo(
    () => matrixRows.length && periodHeaders.length
      ? RCCP_ROW_LABEL_WIDTH + periodHeaders.length * RCCP_WEEK_COL_WIDTH
      : 0,
    [matrixRows.length, periodHeaders.length],
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
  const hoverBoxRef = useRef(null);
  const hydratedRef = useRef(false);
  const parentHover = useContext(RccpSegmentHoverContext);
  const fallbackDataAreaId = useMemo(() => firstChartDataAreaId(chart), [chart]);

  useEffect(() => {
    const ready = !visibility || visibility.ready !== false;
    if (!ready) {
      hydratedRef.current = false;
      setVisibleKeys(mergeChartVisibleKeys(orderedRows, {}, {}));
      return;
    }
    const preferStored = Boolean(visibility) && !hydratedRef.current;
    hydratedRef.current = true;
    setVisibleKeys((prev) => mergeChartVisibleKeys(
      orderedRows,
      prev,
      visibility?.savedKeys || {},
      { preferStored },
    ));
  }, [orderedRows, visibility, visibility?.savedKeys, visibility?.ready]);

  const handleToggle = useCallback((measureKey, checked) => {
    setVisibleKeys((prev) => {
      const next = { ...prev, [measureKey]: checked };
      visibility?.onChange?.(next);
      return next;
    });
  }, [visibility]);
  const handleSegmentHover = useCallback((next) => {
    if (!next) {
      setHoveredSegment(null);
      return;
    }
    if (hoverBoxRef.current) {
      hoverBoxRef.current.style.left = `${next.x + 12}px`;
      hoverBoxRef.current.style.top = `${next.y + 12}px`;
    }
    setHoveredSegment((prev) => (isSameRccpHover(prev, next) ? prev : next));
  }, []);
  const highlightItem = hoveredSegment?.segment?.itemNumber || '';
  const parentOnClick = parentHover?.onClick;
  const hoverValue = useMemo(() => ({
    onHover: handleSegmentHover,
    onClick: parentOnClick,
    highlightItem,
  }), [handleSegmentHover, parentOnClick, highlightItem]);

  const openRow = useMemo(() => orderedRows.find((row) => row.isOpen), [orderedRows]);
  const deliveredRow = useMemo(() => orderedRows.find((row) => row.isDelivered), [orderedRows]);
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

  const activeRows = useMemo(
    () => orderedRows.filter((row) => visibleKeys[row.measureKey] && !isStackRow(row)),
    [orderedRows, visibleKeys],
  );

  const chartRows = useMemo(() => buildRccpChartRows({
    chart, openVisible, deliveredVisible, openColor, receivedColor,
  }), [chart, openVisible, deliveredVisible, openColor, receivedColor]);
  const todayMarker = useMemo(() => todayBand(periodHeaders), [periodHeaders]);
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
    <RccpLinkedHScroll
      contentWidth={gridWidth}
      top={(
        <div
          key={seriesSignature}
          style={{ marginLeft: RCCP_ROW_LABEL_WIDTH - RCCP_CHART_Y_AXIS_WIDTH }}
        >
          <RccpSegmentHoverContext.Provider value={hoverValue}>
            <RccpChartPlot
              plot={plot}
              stack={stack}
              todayMarker={todayMarker}
            />
          </RccpSegmentHoverContext.Provider>
          <RccpPoSegmentHoverCard
            hover={hoveredSegment}
            boxRef={hoverBoxRef}
            fallbackDataAreaId={fallbackDataAreaId}
          />
        </div>
      )}
      bottom={(
        <RccpMatrixTable
          measureRows={matrixRows}
          periods={periods}
          cellMap={cellMap}
          visibleKeys={visibleKeys}
          onToggleVisible={handleToggle}
          onCellClick={onCellClick}
          interactive={interactive}
          gridWidth={gridWidth}
        />
      )}
    />
  );

  return (
    <div className={styles.root}>
      <Card className={compact ? styles.chartCardCompact : styles.chartCard}>
        {!compact && (
          <div className={styles.chartHeader}>
            <Text weight="semibold">Capacity vs load</Text>
          </div>
        )}
        {compact ? <div className={styles.chartArea}>{alignedContent}</div> : alignedContent}
      </Card>
    </div>
  );
}

export default memo(RccpChartMatrixPanel);
