import React, { memo, useMemo } from 'react';
import {
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItemCheckbox,
  Button, makeStyles, mergeClasses, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { ChartMultipleRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';
import { stripFlexStyle } from './biConstants';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    minHeight: 0,
    height: '100%',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  strip: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    ...shorthands.gap(tokens.spacingHorizontalS),
    overflow: 'hidden',
    flexGrow: 1,
    minHeight: 0,
    width: '100%',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    ...shorthands.padding(tokens.spacingVerticalSNudge),
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
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flexGrow: 1,
  },
  chartWrap: { flex: 1, minHeight: 0, minWidth: 0 },
  /** KPI's stapelen per 2 in één kolom; elke kaart pakt exact de helft van de hoogte. */
  kpiColumn: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingHorizontalS),
    minHeight: 0,
    minWidth: 0,
  },
  kpiCard: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  empty: { color: tokens.colorNeutralForeground3, ...shorthands.padding(tokens.spacingVerticalL) },
});

function BiChartStrip({
  availableCharts, selectedIds, onToggleChart, height, columns = [],
}) {
  const styles = useStyles();
  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedCharts = useMemo(
    () => availableCharts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [availableCharts, selectedIdSet],
  );

  const chartHeight = Math.max(100, (height || 280) - 64);

  /** KPI's per 2 groeperen zodat ze onder elkaar in één kolombreedte passen. */
  const groups = useMemo(() => {
    const result = [];
    selectedCharts.forEach((chart) => {
      if (chart.config?.type !== 'kpi') {
        result.push([chart]);
        return;
      }
      const last = result[result.length - 1];
      if (last && last.length === 1 && last[0].config?.type === 'kpi') {
        last.push(chart);
        return;
      }
      result.push([chart]);
    });
    return result;
  }, [selectedCharts]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
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
          {groups.map((group) => {
            const isKpiColumn = group[0].config?.type === 'kpi';
            const cards = group.map((chart) => {
              const chartType = chart.config?.type;
              return (
                <div
                  className={mergeClasses(styles.card, isKpiColumn && styles.kpiCard)}
                  key={chart.id}
                  style={isKpiColumn ? undefined : stripFlexStyle(chart, selectedCharts)}
                >
                  <div className={styles.cardHeader}>
                    <Text className={styles.cardTitle} title={chart.name}>{chart.name}</Text>
                  </div>
                  <div className={styles.chartWrap}>
                    <ChartRenderer
                      type={chartType}
                      series={chart.series || []}
                      config={chart.config}
                      columns={columns}
                      height={isKpiColumn ? '100%' : chartHeight}
                    />
                  </div>
                </div>
              );
            });

            if (!isKpiColumn) return cards;

            return (
              <div
                className={styles.kpiColumn}
                key={`kpi-${group[0].id}`}
                style={stripFlexStyle(group[0], selectedCharts)}
              >
                {cards}
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
