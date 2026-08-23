import React, { memo } from 'react';
import { Badge, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { refreshDurationLabel } from '../../utils/d365RefreshDuration';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('10px', '12px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('6px'),
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

function formatWhen(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-GB');
}

function statusColor(status) {
  if (status === 'done') return 'success';
  if (status === 'error' || status === 'interrupted') return 'danger';
  return 'informative';
}

function D365RefreshHistory({ runs }) {
  const styles = useStyles();
  const items = Array.isArray(runs) ? runs : [];
  if (!items.length) {
    return <Text className={styles.meta}>No refresh runs yet.</Text>;
  }
  return (
    <div className={styles.list}>
      {items.map((run) => {
        const title = [run.error_text, run.alert_status === 'failed' ? 'Alert not sent' : '', run.alert_status === 'skipped' ? 'Alert skipped' : '']
          .filter(Boolean)
          .join(' · ');
        const duration = refreshDurationLabel(run.started_at, run.finished_at, run.status);
        return (
          <div key={run.id} className={styles.row} title={title || undefined}>
            <div className={styles.top}>
              <Badge appearance="tint" color={statusColor(run.status)}>{run.status}</Badge>
              {run.source === 'night' ? <Badge appearance="outline" color="brand">Night</Badge> : null}
              {run.alert_status === 'failed' || run.alert_status === 'skipped' ? (
                <Badge appearance="tint" color="warning">Alert not sent</Badge>
              ) : null}
              <Text className={styles.meta}>{formatWhen(run.started_at)}</Text>
              <Text className={styles.meta}>{duration}</Text>
            </div>
            <Text className={styles.meta}>
              {`Fetched from D365 ${run.fetched_total || 0} · Cache rows +${run.inserted_total || 0} ~${run.updated_total || 0} · Removed from cache ${run.deleted_total || 0}`}
            </Text>
            {run.error_text ? <Text className={styles.error}>{run.error_text}</Text> : null}
            {(run.entities || []).filter((entity) => entity.error_text).map((entity) => (
              <Text key={entity.tableKey} className={styles.error}>
                {`${entity.label || entity.tableKey}: ${entity.error_text}`}
              </Text>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default memo(D365RefreshHistory);
