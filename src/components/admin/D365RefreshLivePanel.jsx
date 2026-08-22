import React, { memo } from 'react';
import { ProgressBar, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  label: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function barValue(status, overall) {
  if (status === 'done' || status === 'error') return 1;
  if (status === 'running') return Math.min(0.95, Math.max(0.08, Number(overall) || 0.15));
  return 0;
}

function D365RefreshLivePanel({ run }) {
  const styles = useStyles();
  const entities = Array.isArray(run?.entities) ? run.entities : [];
  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <Text className={styles.label}>
          {run?.currentLabel ? `Current: ${run.currentLabel}` : 'Waiting for a run'}
        </Text>
        <ProgressBar value={Number(run?.overall) || 0} />
        <Text className={styles.meta}>
          {run?.entityIndex || 0}/{run?.entityCount || 0} entities
        </Text>
      </div>
      {entities.map((entity) => (
        <div key={entity.tableKey} className={styles.row}>
          <Text className={styles.label}>{entity.label}</Text>
          <ProgressBar value={barValue(entity.status, 0.5)} />
          <Text className={styles.meta}>
            {entity.status}
            {` · Fetched from D365 ${entity.fetched || 0}`}
            {` · Cache rows +${entity.inserted || 0} ~${entity.updated || 0}`}
            {` · Removed from cache ${entity.deleted || 0}`}
          </Text>
        </div>
      ))}
    </div>
  );
}

export default memo(D365RefreshLivePanel);
