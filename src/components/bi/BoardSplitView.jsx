import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import {
  Badge, Button, Tab, TabList, Text, makeStyles, shorthands, Spinner, tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppToast } from '../../hooks/useAppToast';
import { useRccpWindow } from '../../hooks/useRccpWindow';
import { resolveRccpVendorFromFilter } from '../rccp/resolveRccpVendorFilter';
import { formatIsoWindowLabel } from '../rccp/rccpUtils';
import { useSplitPane } from './hooks/useSplitPane';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useBiMeta } from './hooks/useBiMeta';
import { BOARD_KEY } from './biConstants';
import { buildTableDataRevision } from './tableDataRevision';

const BiChartStrip = lazy(() => import('./BiChartStrip'));
const RccpSplitStrip = lazy(() => import('../rccp/RccpSplitStrip'));

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 },
  tableRegion: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',
    '& > *': {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
      scrollbarGutter: 'stable',
    },
  },
  toggleBar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    flexWrap: 'wrap',
  },
  toggleSpacer: { flex: 1, minWidth: '8px' },
  weekMeta: { color: tokens.colorNeutralForeground3, fontSize: '12px' },
  pane: {
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('8px', '8px', '4px'),
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: 0,
  },
});

export default function BoardSplitView({ filterByColumn, tableRows, isStaff, children }) {
  const styles = useStyles();
  const { user } = useAuth();
  const { notifyError } = useAppToast();
  const split = useSplitPane();
  const { isoWindow } = useRccpWindow();
  const { charts, updateChart } = useBiCharts();
  const meta = useBiMeta(BOARD_KEY);

  const handleTabSelect = useCallback((_, data) => {
    split.setActiveTab(data.value);
    if (!split.open) split.toggleOpen();
  }, [split]);

  const handleWidthChange = useCallback(async (chart, chartSize) => {
    if (Number(chart.userId) !== Number(user?.id)) return;
    try {
      await updateChart(chart.id, {
        name: chart.name,
        visibility: chart.visibility,
        config: {
          ...chart.config,
          options: { ...(chart.config?.options || {}), chartSize },
        },
      });
    } catch (err) {
      notifyError(err.message || 'Failed to update chart size');
    }
  }, [updateChart, user?.id, notifyError]);

  const selectedIdSet = useMemo(() => new Set(split.chartIds.map(String)), [split.chartIds]);
  const selectedCharts = useMemo(
    () => charts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [charts, selectedIdSet],
  );

  const dataRevision = useMemo(() => buildTableDataRevision(tableRows), [tableRows]);
  const vendorAccount = useMemo(
    () => resolveRccpVendorFromFilter(filterByColumn),
    [filterByColumn],
  );
  const rccpRefreshKey = useMemo(
    () => `${dataRevision}|${vendorAccount || ''}`,
    [dataRevision, vendorAccount],
  );
  const windowLabel = useMemo(() => formatIsoWindowLabel(isoWindow), [isoWindow]);

  const biPaneActive = split.open && split.activeTab === 'bi';
  const rccpPaneActive = split.open && split.activeTab === 'rccp';

  const { resultsById } = useChartData({
    charts: biPaneActive ? selectedCharts : [],
    externalFilterByColumn: filterByColumn,
    dataRevision,
  });

  const chartsWithSeries = useMemo(
    () => charts.map((chart) => ({ ...chart, series: resultsById[String(chart.id)] || [] })),
    [charts, resultsById],
  );

  if (!isStaff) return children;

  return (
    <div className={styles.root}>
      <div className={styles.tableRegion}>{children}</div>

      <div className={styles.toggleBar}>
        <TabList
          size="small"
          selectedValue={split.activeTab}
          onTabSelect={handleTabSelect}
        >
          <Tab value="bi">Charts</Tab>
          <Tab value="rccp">RCCP</Tab>
        </TabList>

        {split.activeTab === 'rccp' && windowLabel ? (
          <Text className={styles.weekMeta}>{windowLabel}</Text>
        ) : null}

        {split.activeTab === 'bi' && split.chartIds.length ? (
          <Badge appearance="tint" color="informative">{split.chartIds.length} selected</Badge>
        ) : null}

        <span className={styles.toggleSpacer} />

        <Button
          size="small"
          appearance="subtle"
          icon={split.open ? <ChevronDownRegular /> : <ChevronUpRegular />}
          onClick={split.toggleOpen}
        >
          {split.open ? 'Hide panel' : 'Show panel'}
        </Button>
      </div>

      {split.open ? (
        <div className={styles.pane} style={{ height: `${split.height}px` }}>
          {split.activeTab === 'bi' ? (
            <Suspense fallback={<Spinner size="tiny" label="Loading charts…" />}>
              <BiChartStrip
                availableCharts={chartsWithSeries}
                selectedIds={split.chartIds}
                onToggleChart={split.toggleChart}
                onWidthChange={handleWidthChange}
                currentUserId={user?.id}
                height={split.height}
                columns={meta.columns}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<Spinner size="tiny" label="Loading RCCP…" />}>
              <RccpSplitStrip
                vendorAccount={vendorAccount}
                refreshKey={rccpRefreshKey}
                height={split.height}
                enabled={rccpPaneActive}
                isoWindow={isoWindow}
              />
            </Suspense>
          )}
        </div>
      ) : null}
    </div>
  );
}
