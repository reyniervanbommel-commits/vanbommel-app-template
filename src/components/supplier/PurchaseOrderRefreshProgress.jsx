import React, { memo, useMemo } from 'react';
import { ProgressBar, Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  progressText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function formatRefreshProgress(progress) {
  if (!progress) return '';
  const fetched = Number(progress.fetched) || 0;
  const totalToFetch = Number(progress.totalToFetch);
  const hasTotal = Number.isFinite(totalToFetch) && totalToFetch > 0;
  const countLabel = hasTotal
    ? `${fetched.toLocaleString()} / ${totalToFetch.toLocaleString()} orders`
    : `${fetched.toLocaleString()} orders`;
  if (progress.status === 'saving') return `Fetching D365 data: ${countLabel} - saving to cache`;
  if (progress.status === 'done') return `D365 refresh complete: ${countLabel}`;
  return `Fetching D365 data: ${countLabel}`;
}

function PurchaseOrderRefreshProgress({ progress }) {
  const styles = useStyles();
  const progressLabel = useMemo(() => formatRefreshProgress(progress), [progress]);
  const progressValue = useMemo(() => {
    const totalToFetch = Number(progress?.totalToFetch);
    if (!Number.isFinite(totalToFetch) || totalToFetch <= 0) return undefined;
    return Math.min((Number(progress?.fetched) || 0) / totalToFetch, 1);
  }, [progress]);

  if (!progressLabel) return null;

  return (
    <div className={styles.progressWrap}>
      <ProgressBar value={progressValue} />
      <Text className={styles.progressText}>{progressLabel}</Text>
    </div>
  );
}

export default memo(PurchaseOrderRefreshProgress);
