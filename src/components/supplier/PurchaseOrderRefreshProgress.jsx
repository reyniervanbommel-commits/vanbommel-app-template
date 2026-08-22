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
  barWrap: {
    minWidth: '120px',
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
});

function PurchaseOrderRefreshProgress({
  progress,
  run,
  refreshing,
  onRefresh,
  canRefresh = true,
  showProgress = true,
}) {
  const styles = useStyles();
  const overall = Number(run?.overall) || 0;
  const label = run?.currentLabel || '';
  const showLive = Boolean(showProgress && refreshing);

  const icon = useMemo(() => {
    if (showLive) return <Spinner size="tiny" />;
    return <ArrowClockwiseRegular />;
  }, [showLive]);

  return (
    <div className={styles.root}>
      <Button
        appearance="primary"
        icon={icon}
        onClick={onRefresh}
        disabled={refreshing || !canRefresh}
        title={canRefresh ? 'Refresh data from D365' : 'Only admin can refresh'}
      >
        D365F&O
      </Button>
      {showLive ? (
        <>
          <div className={styles.barWrap}>
            <ProgressBar value={overall} />
          </div>
          <Text className={styles.label}>{label || progress?.status || 'Running'}</Text>
        </>
      ) : null}
    </div>
  );
}

export default memo(PurchaseOrderRefreshProgress);
