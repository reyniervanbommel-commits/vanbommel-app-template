import React, { memo } from 'react';
import {
  ComposedChart, Line, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, ReferenceLine,
} from 'recharts';
import { makeStyles, tokens } from '@fluentui/react-components';
import RccpWeekBandCursor from './RccpWeekBandCursor';
import { RccpPoStackBarAbove, RccpPoStackBarBelow } from './RccpPoStackBar';
import { RCCP_PO_BAR_SIZE } from './rccpPoStack';
import { RCCP_CHART_Y_AXIS_WIDTH, RCCP_WARNING_MEASURE_KEY } from './rccpUtils';

const useStyles = makeStyles({
  plot: { position: 'relative' },
  todaySvg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
});

function EmptyTooltip() {
  return null;
}

function renderStackAbove(props) {
  return <RccpPoStackBarAbove {...props} />;
}

function renderStackBelow(props) {
  return <RccpPoStackBarBelow {...props} />;
}

function RccpChartPlot({ plot, stack, todayX }) {
  const styles = useStyles();
  const {
    data, width, height, compact, weekBoundaryCoordinates, chartRangeBands, activeRows,
  } = plot;
  const {
    openVisible, deliveredVisible, openRow, deliveredRow, receivedColor,
  } = stack;

  return (
    <div className={styles.plot} style={{ width, height }}>
      <ComposedChart
        width={width}
        height={height}
        data={data}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          stroke={tokens.colorNeutralStroke2}
          strokeDasharray="4 4"
          verticalCoordinatesGenerator={weekBoundaryCoordinates}
        />
        <XAxis dataKey="key" scale="band" padding={{ left: 0, right: 0 }} hide />
        <YAxis tick={{ fontSize: compact ? 11 : 12 }} width={RCCP_CHART_Y_AXIS_WIDTH} />
        <ReferenceLine y={0} stroke={tokens.colorNeutralStroke1} strokeWidth={1} />
        <Tooltip shared cursor={<RccpWeekBandCursor />} content={EmptyTooltip} />
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
        {(openVisible || deliveredVisible) && (
          <Bar
            dataKey="__stackAbove"
            name={openRow?.label || deliveredRow?.label}
            fill={openRow?.color || receivedColor}
            shape={renderStackAbove}
            barSize={RCCP_PO_BAR_SIZE}
            legendType={openVisible ? 'rect' : 'none'}
            cursor="pointer"
            isAnimationActive={false}
          />
        )}
        {deliveredVisible && (
          <Bar
            dataKey="__stackBelow"
            name={deliveredRow.label}
            fill={receivedColor}
            shape={renderStackBelow}
            barSize={RCCP_PO_BAR_SIZE}
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
      {todayX != null && (
        <svg className={styles.todaySvg} width={width} height={height} aria-hidden>
          <line
            x1={todayX}
            x2={todayX}
            y1={8}
            y2={height - 8}
            stroke={tokens.colorNeutralForeground2}
            strokeWidth={1.5}
          />
        </svg>
      )}
    </div>
  );
}

export default memo(RccpChartPlot);
