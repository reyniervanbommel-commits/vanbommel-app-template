import React from 'react';
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
} from '@fluentui/react-components';
import PurchaseOrderBulkEditFailedRows from './PurchaseOrderBulkEditFailedRows';

export default function PurchaseOrderBulkEditDialog({ dialogState, dialogActions }) {
  const {
    open,
    mode,
    columnLabel,
    selectedCount,
    processedCount,
    busy,
    summaryMessage,
    failedRows = [],
    retryingBulk,
  } = dialogState || {};
  const {
    onOpenChange,
    onChooseSingleCell,
    onChooseBulk,
    onCloseSummary,
    onRetryRow,
    onRetryAllFailed,
  } = dialogActions || {};
  const hasFailedRows = mode === 'summary' && failedRows.length > 0;
  const title = hasFailedRows ? 'Bulk edit finished' : (mode === 'summary' ? 'Bulk edit stopped' : 'Update multiple rows?');

  return (
    <Dialog modalType="alert" open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {mode === 'summary' ? (
              <>
                <Text>{summaryMessage}</Text>
                {hasFailedRows ? (
                  <PurchaseOrderBulkEditFailedRows
                    rows={failedRows}
                    retrying={retryingBulk}
                    onRetryRow={onRetryRow}
                    onRetryAllFailed={onRetryAllFailed}
                  />
                ) : null}
              </>
            ) : (
              <>
                <Text>
                  You selected {selectedCount} visible rows for column "{columnLabel}".
                </Text>
                {busy ? (
                  <Text>
                    <Spinner size="extra-tiny" /> Updating: {processedCount}/{selectedCount}
                  </Text>
                ) : null}
              </>
            )}
          </DialogContent>
          <DialogActions>
            {mode === 'summary' ? (
              <Button appearance="primary" onClick={onCloseSummary} disabled={retryingBulk}>
                Close
              </Button>
            ) : (
              <>
                <Button appearance="secondary" onClick={onChooseSingleCell} disabled={busy}>
                  This cell only
                </Button>
                <Button appearance="primary" onClick={onChooseBulk} disabled={busy}>
                  Apply to selected rows
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
