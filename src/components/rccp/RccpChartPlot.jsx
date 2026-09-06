import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, Cell, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { makeStyles, tokens } from '@fluentui/react-components';
import RccpWeekBandCursor from './RccpWeekBandCursor';
import { RccpPoStackBarAbove, RccpPoStackBarAboveAlt, RccpPoStackBarBelow } from './RccpPoStackBar';
import { brandColor } from '../../styles/brandTokens';
import { RCCP_PO_BAR_SIZE, rccpPoStackBarFlags, rccpChartYAxisScale } from './rccpPoStack';
import {
  RCCP_CHART_TOP_MARGIN,
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_WARNING_MEASURE_KEY,
  rccpChartPlotArea,
  rccpHoverCenterX,
} from './rccpUtils';

const useStyles = makeStyles({
  plot: {
    position: 'relative',
    outline: 'none',
    // Manual Y-axis zoom (see useRccpChartYScale) lets bars run past the domain on purpose —
    // clip them cleanly at the plot edge instead of letting them bleed into the row labels
    // or the matrix table below.
    overflow: 'hidden',
    '& .recharts-wrapper': { outline: 'none', boxShadow: 'none' },
    '& .recharts-surface': { outline: 'none', boxShadow: 'none' },
    '& svg:focus': { outline: 'none', boxShadow: 'none' },
    '& svg:focus-visible': { outline: 'none', boxShadow: 'none' },
  },
  todaySvg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
});

function preventChartFocus(event) {
  event.preventDefault();
}

function renderStackAbove(props) {
  return <RccpPoStackBarAbove {...props} />;
}

function renderStackAboveAlt(props) {
  return <RccpPoStackBarAboveAlt {...props} />;
}

function renderStackBelow(props) {
  return <RccpPoStackBarBelow {...props} />;
}

function RccpChartPlot({ plot, stack, todayMarker }) {
  const styles = useStyles();
  const {
    data, width, height, compact, weekBoundaryCoordinates, chartRangeBands, activeRows, yDomain,
  } = plot;
  const {
    openVisible, deliveredVisible, orderedVisible, openRow, orderedRow, deliveredRow, receivedColor,
    dual, barSize, primaryLabel, secondaryLabel,
  } = stack;
  const stackBars = rccpPoStackBarFlags({
    openVisible, orderedVisible, deliveredVisible, dual,
  });
  const stackBarSize = Number(barSize) || RCCP_PO_BAR_SIZE;
  const yAxisScale = useMemo(() => rccpChartYAxisScale(yDomain), [yDomain]);
  const plotBottom = rccpChartPlotArea(height).bottom;
  const labelOnRight = todayMarker?.todayX != null && (todayMarker.todayX + 48) < width;

  const [hoverX, setHoverX] = useState(null);
  const periodCount = data.length;
  const handleMouseMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverX(rccpHoverCenterX(event.clientX - rect.left, periodCount));
  }, [periodCount]);
  const handleMouseLeave = useCallback(() => setHoverX(null), []);

  return (
    <div
      className={styles.plot}
      style={{ width, height }}
      onMouseDown={preventChartFocus}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ComposedChart
        width={width}
        height={height}
        data={data}
        margin={{ top: RCCP_CHART_TOP_MARGIN, right: 0, left: 0, bottom: 0 }}
        barCategoryGap={0}
        barGap={0}
        style={{ outline: 'none' }}
        accessibilityLayer={false}
        tabIndex={-1}
      >
        <CartesianGrid
          stroke={tokens.colorNeutralStroke2}
          strokeDasharray="4 4"
          verticalCoordinatesGenerator={weekBoundaryCoordinates}
        />
        <XAxis dataKey="key" scale="band" padding={{ left: 0, right: 0 }} hide />
        <YAxis
          hide
          tick={{ fontSize: compact ? 11 : 12 }}
          width={RCCP_CHART_Y_AXIS_WIDTH}
          {...yAxisScale}
        />
        <ReferenceLine y={0} stroke={tokens.colorNeutralStroke1} strokeWidth={1} />
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
        {stackBars.showAbove && (
          <Bar
            dataKey="__stackAbove"
            name={primaryLabel || openRow?.label || orderedRow?.label || deliveredRow?.label}
            fill={openRow?.color || receivedColor}
            shape={renderStackAbove}
            barSize={stackBarSize}
            cursor="pointer"
            isAnimationActive={false}
          />
        )}
        {stackBars.showAboveAlt && (
          <Bar
            dataKey="__stackAboveAlt"
            name={secondaryLabel}
            fill={openRow?.color || receivedColor}
            shape={renderStackAboveAlt}
            barSize={stackBarSize}
            cursor="pointer"
            isAnimationActive={false}
          />
        )}
        {stackBars.showBelow && (
          <Bar
            dataKey="__stackBelow"
            name={deliveredRow?.label}
            fill={receivedColor}
            shape={renderStackBelow}
            barSize={stackBarSize}
            cursor="pointer"
            isAnimationActive={false}
          />
        )}
        {activeRows.map((row) => (
          row.chartType === 'bar' ? (
            <Bar
              key={`${row.measureKey}-bar`}
              dataKey={row.measureKey}
              name={row.label}
              fill={row.color}
              stackId="rccp_load"
              barSize={compact ? 10 : 14}
            >
              {data.map((point, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={point.__overloaded__ ? '#D13438' : row.color}
                  fillOpacity={point.__overloaded__ ? 0.85 : 1}
                />
              ))}
            </Bar>
          ) : (
            <Line
              key={`${row.measureKey}-line`}
              type="monotone"
              dataKey={row.measureKey}
              name={row.label}
              stroke={row.color}
              strokeWidth={row.measureKey === RCCP_WARNING_MEASURE_KEY ? 1.5 : 2}
              dot={false}
              strokeDasharray={row.isDashed ? '6 3' : undefined}
            />
          )
        ))}
      </ComposedChart>
      <svg className={styles.todaySvg} width={width} height={plotBottom} aria-hidden>
        <RccpWeekBandCursor x={hoverX} top={RCCP_CHART_TOP_MARGIN} height={plotBottom - RCCP_CHART_TOP_MARGIN} />
      </svg>
      {todayMarker?.todayX != null && (
        <svg className={styles.todaySvg} width={width} height={plotBottom} aria-hidden>
          <rect
            x={todayMarker.bandX}
            y={8}
            width={todayMarker.bandWidth}
            height={Math.max(0, plotBottom - 16)}
            fill={brandColor.navyMid}
            fillOpacity={0.14}
          />
          <line
            x1={todayMarker.todayX}
            x2={todayMarker.todayX}
            y1={8}
            y2={plotBottom - 8}
            stroke={brandColor.navyMid}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <text
            x={todayMarker.todayX + (labelOnRight ? 6 : -6)}
            y={18}
            textAnchor={labelOnRight ? 'start' : 'end'}
            fill={brandColor.navyMid}
            fontSize="11"
            fontWeight="600"
            stroke={tokens.colorNeutralBackground1}
            strokeWidth="3"
            paintOrder="stroke"
          >
            Today
          </text>
        </svg>
      )}
    </div>
  );
}

export default memo(RccpChartPlot);
