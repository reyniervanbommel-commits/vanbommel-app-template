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
  const title = mode === 'summary' ? 'Bulkbewerking gestopt' : 'Meerdere rijen bijwerken?';
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
                  Je hebt {selectedCount} zichtbare rijen geselecteerd voor kolom "{columnLabel}".
                </Text>
                {busy ? (
                  <Text>
                    <Spinner size="extra-tiny" /> Bijwerken bezig: {processedCount}/{selectedCount}
                  </Text>
                ) : null}
              </>
            )}
          </DialogContent>
          <DialogActions>
            {mode === 'summary' ? (
              <Button appearance="primary" onClick={onCloseSummary}>
                Sluiten
              </Button>
            ) : (
              <>
                <Button appearance="secondary" onClick={onChooseSingleCell} disabled={busy}>
                  Alleen deze cel
                </Button>
                <Button appearance="primary" onClick={onChooseBulk} disabled={busy}>
                  Toepassen op geselecteerde rijen
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
