import React, { memo, useMemo } from 'react';
import { Button, Spinner, makeStyles } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '32px',
  },
});

function formatCounter(value, total) {
  const safeValue = Number(value) || 0;
  const hasTotal = Number.isFinite(total) && total > 0;
  return `${safeValue.toLocaleString()}/${hasTotal ? total.toLocaleString() : '?'}`;
}

function buildRefreshCounters(progress) {
  if (!progress) {
    return {
      fetchCounter: '0/?',
      saveCounter: '0/?',
    };
  }
  const fetched = Number(progress.fetched) || 0;
  const totalToFetch = Number(progress.totalToFetch);
  const saved = Number(progress.saved) || 0;
  const totalToSave = Number(progress.totalToSave);
  const effectiveSaveTotal = Number.isFinite(totalToSave) && totalToSave > 0
    ? totalToSave
    : totalToFetch;
  return {
    fetchCounter: formatCounter(fetched, totalToFetch),
    saveCounter: formatCounter(saved, effectiveSaveTotal),
  };
}

function PurchaseOrderRefreshProgress({ progress, refreshing, onRefresh }) {
  const styles = useStyles();
  const counters = useMemo(() => buildRefreshCounters(progress), [progress]);

  return (
    <div className={styles.root}>
      <Button
        appearance="primary"
        icon={refreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing
          ? `D365F&O ${counters.fetchCounter} | Save ${counters.saveCounter}`
          : 'D365F&O'}
      </Button>
    </div>
  );
}

export default memo(PurchaseOrderRefreshProgress);
