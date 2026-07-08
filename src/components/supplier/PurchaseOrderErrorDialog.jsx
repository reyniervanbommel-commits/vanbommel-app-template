import React, { memo, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  summary: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '8px',
  },
  block: {
    ...shorthands.margin('10px', '0', '0', '0'),
  },
  blockTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
  },
  details: {
    ...shorthands.padding('10px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

function classifyError(error) {
  const raw = String(error || '').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('timeout') || lower.includes('failed to complete')) {
    return {
      title: 'Request timed out',
      summary: 'The data request took too long and was canceled before SQL returned a result.',
      likelyCause: 'The backend query was blocked or too slow during a temporary lock/contention period.',
      nextStep: 'Try refreshing again. If this keeps happening, we should inspect SQL locks and query execution plans.',
    };
  }

  if (lower.includes('500') || lower.includes('internal server error')) {
    return {
      title: 'Server error while loading data',
      summary: 'The API returned a server-side error while reading purchase-order data.',
      likelyCause: 'A backend exception occurred during SQL read, transformation, or lookup enrichment.',
      nextStep: 'Retry once. If the error returns, check backend logs and the latest SQL/cache changes.',
    };
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('econnreset') || lower.includes('econnrefused')) {
    return {
      title: 'Connection issue',
      summary: 'The frontend could not reliably reach the backend API.',
      likelyCause: 'Backend restart, proxy interruption, or temporary connection drop.',
      nextStep: 'Wait a few seconds and retry. If needed, verify backend health and API reachability.',
    };
  }

  return {
    title: 'Data load failed',
    summary: 'The purchase-order data request failed unexpectedly.',
    likelyCause: 'An unclassified backend or transport error occurred.',
    nextStep: 'Retry the request. If the issue repeats, inspect server logs for exact failure details.',
  };
}

function PurchaseOrderErrorDialog({
  error,
  open,
  onOpenChange,
  onRefresh,
  refreshing,
  canRefresh = true,
}) {
  const styles = useStyles();
  const info = useMemo(() => classifyError(error), [error]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogContent>
            <div className={styles.summary}>{info.summary}</div>
            <div className={styles.block}>
              <div className={styles.blockTitle}>Likely cause</div>
              <div>{info.likelyCause}</div>
            </div>
            <div className={styles.block}>
              <div className={styles.blockTitle}>Recommended next step</div>
              <div>{info.nextStep}</div>
            </div>
            <div className={styles.block}>
              <div className={styles.blockTitle}>Technical details</div>
              <div className={styles.details}>{String(error || 'Unknown error')}</div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="subtle" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              appearance="primary"
              icon={<ArrowClockwiseRegular />}
              onClick={onRefresh}
              disabled={refreshing || !canRefresh}
              title={canRefresh ? 'Probeer opnieuw te verversen' : 'Alleen admin kan verversen'}
            >
              {refreshing ? 'Refreshing...' : 'Refresh data'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export default memo(PurchaseOrderErrorDialog);
