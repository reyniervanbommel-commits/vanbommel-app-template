import React, { memo, useMemo } from 'react';
import { Button, ProgressBar, Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '32px',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '320px',
  },
  progressText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
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
  const fetchProgressValue = useMemo(() => {
    const totalToFetch = Number(progress?.totalToFetch);
    if (!Number.isFinite(totalToFetch) || totalToFetch <= 0) return undefined;
    return Math.min((Number(progress?.fetched) || 0) / totalToFetch, 1);
  }, [progress]);
  const saveProgressValue = useMemo(() => {
    const totalToSave = Number(progress?.totalToSave);
    if (!Number.isFinite(totalToSave) || totalToSave <= 0) return undefined;
    return Math.min((Number(progress?.saved) || 0) / totalToSave, 1);
  }, [progress]);

  return (
    <div className={styles.root}>
      <Button
        appearance="primary"
        icon={refreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing
          ? `Ophalen ${counters.fetchCounter} | Vastleggen ${counters.saveCounter}`
          : 'Vernieuwen'}
      </Button>
      {refreshing ? (
        <div className={styles.progressWrap} aria-live="polite">
          <Text className={styles.progressText}>Ophalen: {counters.fetchCounter}</Text>
          <ProgressBar value={fetchProgressValue} />
          <Text className={styles.progressText}>Vastleggen: {counters.saveCounter}</Text>
          <ProgressBar value={saveProgressValue} />
        </div>
      ) : null}
    </div>
  );
}

export default memo(PurchaseOrderRefreshProgress);
