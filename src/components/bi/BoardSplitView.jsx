import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import {
  Button, Tab, TabList, makeStyles, mergeClasses, shorthands, Spinner, tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { useRccpWindow } from '../../hooks/useRccpWindow';
import { resolveRccpVendorFromFilter } from '../rccp/resolveRccpVendorFilter';
import { useSplitPane } from './hooks/useSplitPane';
import SplitPaneResizeHandle from './SplitPaneResizeHandle';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useBiMeta } from './hooks/useBiMeta';
import { BOARD_KEY } from './biConstants';
import { buildTableDataRevision } from './tableDataRevision';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const BiChartStrip = lazy(() => import('./BiChartStrip'));
const RccpSplitStrip = lazy(() => import('../rccp/RccpSplitStrip'));
const PoBoardKpiStrip = lazy(() => import('../rccp/PoBoardKpiStrip'));

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
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground2,
    flexWrap: 'wrap',
  },
  toggleBarCollapsed: {
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
  },
  pane: {
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS, tokens.spacingVerticalXS),
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: 0,
    overflow: 'auto',
  },
  paneCollapsed: {
    height: 0,
    overflow: 'hidden',
    padding: 0,
    borderTopWidth: 0,
    minHeight: 0,
  },
});

export default function BoardSplitView({
  filterByColumn, tableRows, isStaff, visibleOrders, kpiFilterKey, onKpiFilter, children,
}) {
  const styles = useStyles();
  const { user } = useAuth();
  const isSupplier = user?.role === ROLES.SUPPLIER;
  // Staff en suppliers krijgen beide de split-view; suppliers zien uitsluitend hun eigen data
  // (RCCP + BI worden server-side op hun leveranciersaccount gescoped).
  const showSplit = isStaff || isSupplier;
  const split = useSplitPane();
  const { isoWindow } = useRccpWindow();
  const { charts } = useBiCharts();
  const meta = useBiMeta(BOARD_KEY);

  const handleTabSelect = useCallback((_, data) => {
    split.setActiveTab(data.value);
    if (!split.open) split.toggleOpen();
  }, [split]);

  const selectedIdSet = useMemo(() => new Set(split.chartIds.map(String)), [split.chartIds]);
  const selectedCharts = useMemo(
    () => charts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [charts, selectedIdSet],
  );

  const dataRevision = useMemo(() => buildTableDataRevision(tableRows), [tableRows]);
  // Staff leidt de vendor af uit een actief kolomfilter; een supplier is altijd zijn eigen
  // leveranciersaccount (het bord is voor hem al op die vendor gescoped).
  const vendorAccount = useMemo(
    () => (isSupplier
      ? (user?.vendor_account || '')
      : resolveRccpVendorFromFilter(filterByColumn)),
    [isSupplier, user?.vendor_account, filterByColumn],
  );
  const rccpRefreshKey = useMemo(
    () => `${dataRevision}|${vendorAccount || ''}`,
    [dataRevision, vendorAccount],
  );
  const showBiPane = split.open && split.activeTab === 'bi';
  const showRccpPane = split.open && split.activeTab === 'rccp';
  const kpiEnabled = split.open && split.activeTab === 'kpis';

  const { resultsById } = useChartData({
    charts: showBiPane ? selectedCharts : [],
    externalFilterByColumn: filterByColumn,
    dataRevision,
  });

  const chartsWithSeries = useMemo(
    () => charts.map((chart) => ({ ...chart, series: resultsById[String(chart.id)] || [] })),
    [charts, resultsById],
  );

  if (!showSplit) return children;

  return (
    <div className={styles.root}>
      <div className={styles.tableRegion}>{children}</div>
      {split.open ? (
        <SplitPaneResizeHandle height={split.height} onResize={split.setHeight} />
      ) : null}

      <div className={mergeClasses(styles.toggleBar, !split.open && styles.toggleBarCollapsed)}>
        <Button
          size="small"
          appearance="subtle"
          icon={split.open ? <ChevronDownRegular /> : <ChevronUpRegular />}
          aria-expanded={split.open}
          aria-label={split.open ? 'Hide panel' : 'Show panel'}
          onClick={split.toggleOpen}
        />

        <TabList
          size="small"
          selectedValue={split.activeTab}
          onTabSelect={handleTabSelect}
        >
          <Tab value="bi">Charts</Tab>
          <Tab value="rccp">RCCP</Tab>
          <Tab value="kpis">KPIs</Tab>
        </TabList>
      </div>

      <div
        className={split.open ? styles.pane : styles.paneCollapsed}
        style={split.open ? { height: `${split.height}px` } : undefined}
        aria-hidden={!split.open}
      >
        <div hidden={!showBiPane}>
          {showBiPane ? (
            <Suspense fallback={<Spinner size="tiny" label="Loading charts…" />}>
              <BiChartStrip
                availableCharts={chartsWithSeries}
                selectedIds={split.chartIds}
                onToggleChart={split.toggleChart}
                height={split.height}
                columns={meta.columns}
              />
            </Suspense>
          ) : null}
        </div>
        <div hidden={!showRccpPane}>
          {showRccpPane ? (
            <Suspense fallback={<Spinner size="tiny" label="Loading RCCP…" />}>
              <RccpSplitStrip
                vendorAccount={vendorAccount}
                refreshKey={rccpRefreshKey}
                height={split.height}
                enabled
                isoWindow={isoWindow}
              />
            </Suspense>
          ) : null}
        </div>
        <div hidden={!kpiEnabled}>
          {kpiEnabled ? (
            <Suspense fallback={<Spinner size="tiny" label="Loading KPIs…" />}>
              <PoBoardKpiStrip
                orders={visibleOrders}
                selectedKey={kpiFilterKey || ''}
                onKpiFilter={onKpiFilter}
                refreshKey={dataRevision}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    </div>
  );
}
