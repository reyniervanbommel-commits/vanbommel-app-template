import React, { useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import { useBulkWriteBackJob } from '../../context/BulkWriteBackJobContext';
import { JOB_NEEDS_ATTENTION, JOB_RUNNING, isJobRunning, jobBadgeLabel } from '../../hooks/bulkWriteBackJobState';
import PurchaseOrderBulkEditFailedRows from '../supplier/PurchaseOrderBulkEditFailedRows';
import D365LogoIcon from '../supplier/D365LogoIcon';

const useStyles = makeStyles({
  badgeButton: {
    minWidth: 'auto',
  },
  failedIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  labelRow: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
  },
});

function BadgeLabel({ label, styles }) {
  const text = String(label || '');
  const idx = text.toLowerCase().indexOf('write-back');
  if (idx < 0) return text;
  const end = idx + 'write-back'.length;
  return (
    <span className={styles.labelRow}>
      {text.slice(0, end)}
      <D365LogoIcon size="small" alt="" />
      {text.slice(end)}
    </span>
  );
}

/**
 * Header-badge + resultaatpaneel voor de achtergrond D365 bulk-write-back.
 * Input: job-context. Output: knop naast de avatar en een dialoog met retry.
 */
export default function BulkWriteBackJobBadge() {
  const styles = useStyles();
  const {
    job,
    panelOpen,
    retryingBulk,
    retryRow,
    retryAllFailed,
    openPanel,
    closePanel,
    dismissJob,
  } = useBulkWriteBackJob();
  const label = jobBadgeLabel(job);
  const running = isJobRunning(job);
  const failed = job?.status === JOB_NEEDS_ATTENTION;
  const displayLabel = retryingBulk && job?.status === JOB_RUNNING ? 'Retrying write-back' : label;
  const handleOpenChange = useCallback((_, data) => {
    if (data.open) {
      openPanel();
      return;
    }
    closePanel();
  }, [closePanel, openPanel]);
  const handlePrimary = useCallback(() => {
    if (running) {
      closePanel();
      return;
    }
    dismissJob();
  }, [closePanel, dismissJob, running]);

  if (!label) return null;

  return (
    <>
      <Button
        appearance="subtle"
        className={styles.badgeButton}
        icon={
          running
            ? <Spinner size="tiny" />
            : (failed ? <ErrorCircleRegular className={styles.failedIcon} /> : undefined)
        }
        onClick={openPanel}
        aria-label={displayLabel}
      >
        <BadgeLabel label={displayLabel} styles={styles} />
      </Button>
      <Dialog open={panelOpen} onOpenChange={handleOpenChange}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {running ? 'Write-back in progress' : 'Bulk edit finished'}
            </DialogTitle>
            <DialogContent>
              <Text block>
                {job?.summaryMessage
                  || `Updating ${job?.processed || 0}/${job?.total || 0} rows in "${job?.columnLabel || 'this column'}".`}
              </Text>
              <PurchaseOrderBulkEditFailedRows
                rows={job?.failedRows || []}
                retrying={retryingBulk || running}
                onRetryRow={retryRow}
                onRetryAllFailed={retryAllFailed}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handlePrimary} disabled={retryingBulk}>
                {running ? 'Close' : 'Dismiss'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
