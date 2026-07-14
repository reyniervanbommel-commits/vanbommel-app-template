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

export default function PurchaseOrderBulkEditDialog({
  open,
  mode,
  columnLabel,
  selectedCount,
  processedCount,
  busy,
  summaryMessage,
  onOpenChange,
  onChooseSingleCell,
  onChooseBulk,
  onCloseSummary,
}) {
  const title = mode === 'summary' ? 'Bulk edit stopped' : 'Update multiple rows?';
  return (
    <Dialog modalType="alert" open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {mode === 'summary' ? (
              <Text>{summaryMessage}</Text>
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
              <Button appearance="primary" onClick={onCloseSummary}>
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
