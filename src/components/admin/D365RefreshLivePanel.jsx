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
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  notice: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

function entityBarValue(entity) {
  if (entity.status === 'done' || entity.status === 'error') return 1;
  if (entity.status !== 'running') return 0;
  const total = Number(entity.totalToFetch);
  const fetched = Number(entity.fetched) || 0;
  if (Number.isFinite(total) && total > 0) return Math.min(0.99, fetched / total);
  return fetched > 0 ? 0.45 : 0.12;
}

function fetchedLabel(entity) {
  const fetched = Number(entity.fetched) || 0;
  const total = Number(entity.totalToFetch);
  if (Number.isFinite(total) && total > 0) return `Fetched from D365 ${fetched} / ${total}`;
  return `Fetched from D365 ${fetched}`;
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
          <ProgressBar value={entityBarValue(entity)} />
          <Text className={styles.meta}>
            {entity.status}
            {` · ${fetchedLabel(entity)}`}
            {` · Cache rows +${entity.inserted || 0} ~${entity.updated || 0}`}
            {` · Removed from cache ${entity.deleted || 0}`}
          </Text>
          {entity.error_text ? <Text className={styles.error}>{entity.error_text}</Text> : null}
          {entity.notice_text ? <Text className={styles.notice}>{entity.notice_text}</Text> : null}
        </div>
      ))}
    </div>
  );
}

export default memo(D365RefreshLivePanel);
export { entityBarValue, fetchedLabel };
