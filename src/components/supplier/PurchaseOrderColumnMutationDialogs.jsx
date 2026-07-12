import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
} from '@fluentui/react-components';
import ConfirmDialog from '../shared/ConfirmDialog';

export default function PurchaseOrderColumnMutationDialogs({
  columnLabel,
  renameOpen,
  renameValue,
  renameBusy,
  onRenameValueChange,
  onRenameCancel,
  onRenameSubmit,
  removeOpen,
  removeBusy,
  onRemoveCancel,
  onRemoveConfirm,
}) {
  return (
    <>
      <Dialog open={renameOpen} onOpenChange={(_, data) => !data.open && onRenameCancel()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Rename column</DialogTitle>
            <DialogContent>
              <Field label="Column name">
                <Input
                  value={renameValue}
                  onChange={onRenameValueChange}
                  disabled={renameBusy}
                  aria-label={`Rename column ${columnLabel}`}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onRenameCancel} disabled={renameBusy}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={onRenameSubmit} disabled={renameBusy}>
                {renameBusy ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDialog
        open={removeOpen}
        title="Delete column"
        message={`Delete column "${columnLabel}"? This permanently removes the column and all related values from SQL.`}
        confirmText={removeBusy ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmDisabled={removeBusy}
        cancelDisabled={removeBusy}
        onConfirm={onRemoveConfirm}
        onCancel={onRemoveCancel}
      />
    </>
  );
}
