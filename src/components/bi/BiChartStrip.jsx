import React, { memo, useMemo } from 'react';
import {
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItemCheckbox,
  Button, makeStyles, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { ChartMultipleRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';
import { stripWidthForSpan } from './biConstants';

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
    ...shorthands.gap('12px'),
    overflowX: 'auto',
    overflowY: 'hidden',
    flexGrow: 1,
    minHeight: 0,
  },
  card: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  cardTitle: { fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  empty: { color: tokens.colorNeutralForeground3, ...shorthands.padding('16px') },
});

function BiChartStrip({ availableCharts, selectedIds, onToggleChart, height, columns = [] }) {
  const styles = useStyles();
  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedCharts = useMemo(
    () => availableCharts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [availableCharts, selectedIdSet],
  );

  // De series worden door BoardSplitView (via useChartData) meegegeven, zodat er per paneel
  // maar één aggregate-read is en de grafieken de tabelfilters erven.
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
          {selectedCharts.map((chart) => (
            <div
              className={styles.card}
              key={chart.id}
              style={{ width: `${stripWidthForSpan(chart.config?.options?.gridSpan)}px` }}
            >
              <Text className={styles.cardTitle}>{chart.name}</Text>
              <ChartRenderer
                type={chart.config?.type}
                series={chart.series || []}
                config={chart.config}
                columns={columns}
                height={chartHeight}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Select one or more charts to display alongside the table.</div>
      )}
    </div>
  );
}

export default memo(BiChartStrip);
