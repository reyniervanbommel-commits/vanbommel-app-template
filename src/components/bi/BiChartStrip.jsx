import React, { memo, useMemo } from 'react';
import {
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItemCheckbox,
  Button, makeStyles, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { ChartMultipleRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';
import ChartWidthSelect from './ChartWidthSelect';
import { resolveChartSize, stripCardStyle } from './biConstants';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    minHeight: 0,
    height: '100%',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('8px') },
  title: { fontWeight: 600, color: tokens.colorNeutralForeground2 },
  strip: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    ...shorthands.gap('12px'),
    overflowX: 'auto',
    overflowY: 'hidden',
    flexGrow: 1,
    minHeight: 0,
    scrollbarGutter: 'stable',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    minHeight: 0,
    flexShrink: 0,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flexGrow: 1,
  },
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

  const chartHeight = Math.max(120, (height || 280) - 70);

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
                style={stripCardStyle(chart)}
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
                <ChartRenderer
                  type={chartType}
                  series={chart.series || []}
                  config={chart.config}
                  columns={columns}
                  height={chartHeight}
                />
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
