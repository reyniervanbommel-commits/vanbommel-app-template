import React from 'react';
import { Dialog, DialogSurface, DialogTitle, DialogBody, DialogContent, DialogActions, Button } from '@fluentui/react-components';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText }) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onCancel()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{message}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Annuleren</Button>
            <Button appearance="primary" onClick={onConfirm}>{confirmText || 'Bevestigen'}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
