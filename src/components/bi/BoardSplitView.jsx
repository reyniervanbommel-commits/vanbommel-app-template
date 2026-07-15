import React, { lazy, Suspense, useMemo } from 'react';
import { Badge, Button, makeStyles, shorthands, Spinner, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { useSplitPane } from './hooks/useSplitPane';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useBiMeta } from './hooks/useBiMeta';
import { BOARD_KEY } from './biConstants';

// Lazy zodat recharts pas in de bundle komt wanneer een staff-gebruiker het paneel opent.
const BiChartStrip = lazy(() => import('./BiChartStrip'));

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
  },
  pane: {
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('8px', '8px', '4px'),
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: 0,
  },
});

export default function BoardSplitView({ filterByColumn, isStaff, children }) {
  const styles = useStyles();
  const split = useSplitPane();
  const { charts } = useBiCharts();
  const meta = useBiMeta(BOARD_KEY);

  const selectedIdSet = useMemo(() => new Set(split.chartIds.map(String)), [split.chartIds]);
  const selectedCharts = useMemo(
    () => charts.filter((chart) => selectedIdSet.has(String(chart.id))),
    [charts, selectedIdSet],
  );

  // Grafieken erven de actieve tabelfilters (#AB:222). Alleen ophalen als het paneel open is.
  const { resultsById } = useChartData({
    charts: split.open ? selectedCharts : [],
    externalFilterByColumn: filterByColumn,
  });

  const chartsWithSeries = useMemo(
    () => charts.map((chart) => ({ ...chart, series: resultsById[chart.id] || [] })),
    [charts, resultsById],
  );

  if (!isStaff) return children;

  return (
    <div className={styles.root}>
      <div className={styles.tableRegion}>{children}</div>

      <div className={styles.toggleBar}>
        <Button
          size="small"
          appearance="subtle"
          icon={split.open ? <ChevronDownRegular /> : <ChevronUpRegular />}
          onClick={split.toggleOpen}
        >
          {split.open ? 'Hide charts' : 'Show charts'}
        </Button>
        {split.chartIds.length ? <Badge appearance="tint" color="informative">{split.chartIds.length} selected</Badge> : null}
      </div>

      {split.open ? (
        <div className={styles.pane} style={{ height: `${split.height}px` }}>
          <Suspense fallback={<Spinner size="tiny" label="Loading charts…" />}>
            <BiChartStrip
              availableCharts={chartsWithSeries}
              selectedIds={split.chartIds}
              onToggleChart={split.toggleChart}
              height={split.height}
              columns={meta.columns}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
