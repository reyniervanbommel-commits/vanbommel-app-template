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
    writeBackBusy,
    largeSelection,
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
  const bulkDisabled = Boolean(busy || writeBackBusy);

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
                <Text block>
                  You selected {selectedCount} visible rows for column "{columnLabel}".
                </Text>
                {largeSelection ? (
                  <Text block>
                    This updates {selectedCount} rows one by one. You can keep working;
                    cells in this column stay locked until each row finishes.
                  </Text>
                ) : null}
                {writeBackBusy ? (
                  <Text block>
                    A write-back is already running. Wait until it finishes before starting another.
                  </Text>
                ) : null}
                {busy ? (
                  <Text block>
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
                <Button appearance="primary" onClick={onChooseBulk} disabled={bulkDisabled}>
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
