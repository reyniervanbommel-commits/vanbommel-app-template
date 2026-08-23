import React, { memo, useCallback, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { refreshDurationLabel } from '../../utils/d365RefreshDuration';
import { formatCount } from '../../utils/formatCount';

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
  notice: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
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

function D365RefreshHistory({ runs, onClear, clearing = false }) {
  const styles = useStyles();
  const items = Array.isArray(runs) ? runs : [];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const handleDialogChange = useCallback((_, data) => setConfirmOpen(Boolean(data.open)), []);
  const handleConfirm = useCallback(async () => {
    if (typeof onClear !== 'function') return;
    await onClear();
    setConfirmOpen(false);
  }, [onClear]);

  if (!items.length) {
    return <Text className={styles.meta}>No refresh runs yet.</Text>;
  }

  return (
    <div className={styles.list}>
      {typeof onClear === 'function' ? (
        <div className={styles.actions}>
          <Button appearance="secondary" onClick={openConfirm} disabled={clearing}>
            Clear history
          </Button>
        </div>
      ) : null}
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
              {`Fetched from D365 ${formatCount(run.fetched_total || 0)} · Cache rows +${formatCount(run.inserted_total || 0)} ~${formatCount(run.updated_total || 0)} · Removed from cache ${formatCount(run.deleted_total || 0)}`}
            </Text>
            {run.error_text ? <Text className={styles.error}>{run.error_text}</Text> : null}
            {(run.entities || []).filter((entity) => entity.error_text).map((entity) => (
              <Text key={`err-${entity.tableKey}`} className={styles.error}>
                {`${entity.label || entity.tableKey}: ${entity.error_text}`}
              </Text>
            ))}
            {(run.entities || []).filter((entity) => entity.notice_text).map((entity) => (
              <Text key={`notice-${entity.tableKey}`} className={styles.notice}>
                {`${entity.label || entity.tableKey}: ${entity.notice_text}`}
              </Text>
            ))}
          </div>
        );
      })}
      <Dialog open={confirmOpen} onOpenChange={handleDialogChange}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Clear refresh history</DialogTitle>
            <DialogContent>
              This permanently deletes finished D365 refresh runs. A run that is still in progress is kept.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={closeConfirm} disabled={clearing}>Cancel</Button>
              <Button appearance="primary" onClick={handleConfirm} disabled={clearing}>
                {clearing ? 'Clearing...' : 'Clear history'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default memo(D365RefreshHistory);
