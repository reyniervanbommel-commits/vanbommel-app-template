import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import RccpChart from './RccpChart';
import RccpMatrixTable from './RccpMatrixTable';
import { formatIsoWindowLabel } from './rccpUtils';
import { useRccpSplitAnalysis } from '../../hooks/useRccpSplitAnalysis';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    minHeight: 0,
    height: '100%',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
  meta: { color: tokens.colorNeutralForeground3, fontSize: '12px' },
  body: {
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.gap('8px'),
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  chartCol: {
    flex: '0 0 75%',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  matrixCol: {
    flex: '0 0 25%',
    minWidth: 0,
    minHeight: 0,
    overflowX: 'auto',
    overflowY: 'auto',
  },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function RccpSplitStrip({ vendorAccount, refreshKey, height, enabled, isoWindow }) {
  const styles = useStyles();
  const windowLabel = useMemo(() => formatIsoWindowLabel(isoWindow), [isoWindow]);
  const chartHeight = Math.max(120, (height || 280) - 56);

  const {
    loading, error, categories, periods, cellMap, chart, categoryColumnKey,
  } = useRccpSplitAnalysis({
    vendorAccount,
    isoWindow,
    enabled,
    refreshKey,
  });

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.meta}>
          {windowLabel ? `Week range: ${windowLabel}` : 'Set week range on the RCCP page'}
          {vendorAccount ? ` · Vendor: ${vendorAccount}` : ' · All vendors'}
        </Text>
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
          <div className={styles.chartCol}>
            <RccpChart chart={chart} chartHeight={chartHeight} compact />
          </div>
          <div className={styles.matrixCol}>
            <RccpMatrixTable
              categories={categories}
              periods={periods}
              cellMap={cellMap}
              groupColumnKey={categoryColumnKey}
              interactive={false}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(RccpSplitStrip);
