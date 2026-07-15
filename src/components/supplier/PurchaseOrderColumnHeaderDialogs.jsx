import React from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input,
} from '@fluentui/react-components';

/**
 * Rename- en delete-dialogs voor een board-kolomheader. Los gehouden zodat
 * PurchaseOrderColumnHeader onder de 300-regelgrens blijft.
 */
export default function PurchaseOrderColumnHeaderDialogs({
  columnLabel,
  errorClassName,
  renameOpen,
  setRenameOpen,
  label,
  setLabel,
  submitRename,
  confirmOpen,
  setConfirmOpen,
  submitRemove,
  busy,
  error,
}) {
  return (
    <>
      <Dialog open={renameOpen} onOpenChange={(_, data) => !busy && setRenameOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Rename column</DialogTitle>
            <DialogContent>
              <Field label="Name" required validationState={error ? 'error' : 'none'} validationMessage={error || undefined}>
                <Input value={label} onChange={(_, data) => setLabel(data.value)} />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRenameOpen(false)} disabled={busy}>Cancel</Button>
              <Button appearance="primary" onClick={submitRename} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(_, data) => !busy && setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete column</DialogTitle>
            <DialogContent>
              Delete column &quot;{columnLabel}&quot;? This permanently removes the column and all related values from SQL. This action cannot be undone.
              {error ? <div className={errorClassName}>{error}</div> : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Button>
              <Button appearance="primary" onClick={submitRemove} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
