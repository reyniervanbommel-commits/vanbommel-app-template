import React, { memo, useMemo } from 'react';
import {
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItemCheckbox,
  Button, makeStyles, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { ChartMultipleRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';
import ChartWidthSelect from './ChartWidthSelect';
import { resolveChartSize, stripFlexStyle } from './biConstants';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    minHeight: 0,
    height: '100%',
    width: '100%',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('8px') },
  title: { fontWeight: 600, color: tokens.colorNeutralForeground2 },
  strip: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    ...shorthands.gap('8px'),
    overflow: 'hidden',
    flexGrow: 1,
    minHeight: 0,
    width: '100%',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('6px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    minHeight: 0,
    minWidth: 0,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('6px'),
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '11px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flexGrow: 1,
  },
  chartWrap: { flex: 1, minHeight: 0, minWidth: 0 },
  empty: { color: tokens.colorNeutralForeground3, ...shorthands.padding('16px') },
});

function BiChartStrip({
  availableCharts, selectedIds, onToggleChart, onWidthChange, currentUserId, height, columns = [],
}) {
  const styles = useStyles();
  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedCharts = useMemo(
    () => availableCharts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [availableCharts, selectedIdSet],
  );

  const chartHeight = Math.max(100, (height || 280) - 64);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.title}>Charts follow the table filters</Text>
        <Menu checkedValues={{ charts: selectedIds.map(String) }}>
          <MenuTrigger disableButtonEnhancement>
            <Button size="small" appearance="secondary" icon={<ChartMultipleRegular />}>Select charts</Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {availableCharts.length ? availableCharts.map((chart) => (
                <MenuItemCheckbox
                  key={chart.id}
                  name="charts"
                  value={String(chart.id)}
                  onClick={() => onToggleChart(chart.id)}
                >
                  {chart.name}
                </MenuItemCheckbox>
              )) : <div className={styles.empty}>No saved charts yet</div>}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {selectedCharts.length ? (
        <div className={styles.strip}>
          {selectedCharts.map((chart) => {
            const canManage = Number(chart.userId) === Number(currentUserId);
            const chartType = chart.config?.type;
            const showSizeSelect = chartType === 'bar' || chartType === 'line';
            return (
              <div
                className={styles.card}
                key={chart.id}
                style={stripFlexStyle(chart, selectedCharts)}
              >
                <div className={styles.cardHeader}>
                  <Text className={styles.cardTitle} title={chart.name}>{chart.name}</Text>
                  {showSizeSelect ? (
                    <ChartWidthSelect
                      chartSize={resolveChartSize(chart)}
                      disabled={!canManage || !onWidthChange}
                      onChange={(chartSize) => onWidthChange?.(chart, chartSize)}
                    />
                  ) : null}
                </div>
                <div className={styles.chartWrap}>
                  <ChartRenderer
                    type={chartType}
                    series={chart.series || []}
                    config={chart.config}
                    columns={columns}
                    height={chartHeight}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>Select one or more charts to display alongside the table.</div>
      )}
    </div>
  );
}

export default memo(BiChartStrip);
