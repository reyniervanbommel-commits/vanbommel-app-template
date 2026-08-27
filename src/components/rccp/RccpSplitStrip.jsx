import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpItemFilter from './RccpItemFilter';
import { formatIsoWindowLabel } from './rccpUtils';
import { useRccpItemFilter } from './useRccpItemFilter';
import { useRccpSplitAnalysis } from '../../hooks/useRccpSplitAnalysis';

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
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
    flexWrap: 'wrap',
  },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  body: { flex: 1, minHeight: 0, overflow: 'hidden' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function RccpSplitStrip({ vendorAccount, refreshKey, height, enabled, isoWindow }) {
  const styles = useStyles();
  const windowLabel = useMemo(() => formatIsoWindowLabel(isoWindow), [isoWindow]);
  const chartHeight = Math.max(120, (height || 280) - 120);

  const {
    loading, error, measureRows, periods, cellMap, chart, chartWeekRanges,
  } = useRccpSplitAnalysis({
    vendorAccount,
    isoWindow,
    enabled,
    refreshKey,
  });

  const {
    itemNumber, items: itemNumbers, filteredChart, handleItemChange,
  } = useRccpItemFilter(chart);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.meta}>
          {windowLabel ? `Week range: ${windowLabel}` : 'Set week range on the RCCP page'}
          {vendorAccount ? ` · Vendor: ${vendorAccount}` : ' · All vendors'}
        </Text>
        <RccpItemFilter
          value={itemNumber}
          onChange={handleItemChange}
          items={itemNumbers}
        />
        <Button
          as={Link}
          to="/rccp"
          size="small"
          appearance="subtle"
          icon={<ArrowRightRegular />}
          iconPosition="after"
        >
          Open RCCP page
        </Button>
      </div>

      {loading && <Spinner size="tiny" label="Loading RCCP…" />}
      {error && <Text className={styles.error}>{error}</Text>}

      {!loading && !error && (
        <div className={styles.body}>
          <RccpChartMatrixPanel
            chart={filteredChart}
            measureRows={measureRows}
            periods={periods}
            cellMap={cellMap}
            chartWeekRanges={chartWeekRanges}
            compact
            chartHeight={chartHeight}
          />
        </div>
      )}
    </div>
  );
}

export default memo(RccpSplitStrip);
