import React, { memo, useState } from 'react';
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
import { DeleteRegular, DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  bar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('4px', '12px'),
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  count: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
  },
});

// Verschijnt zodra er rijen geselecteerd zijn. "Delete" opent een bevestiging;
// de rijen worden alleen uit dit overzicht verborgen (SQL-only exclusion), D365 blijft ongemoeid.
function PurchaseOrderBulkActionsBar({ selectedCount, onDelete, onClear, busy = false }) {
  const styles = useStyles();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (selectedCount <= 0) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const noun = selectedCount === 1 ? 'row' : 'rows';

  return (
    <div className={styles.bar}>
      <span className={styles.count}>{selectedCount} selected</span>
      <Button
        size="small"
        appearance="subtle"
        icon={<DismissRegular />}
        onClick={onClear}
        disabled={busy || deleting}
      >
        Deselect
      </Button>
      <Button
        size="small"
        appearance="primary"
        icon={<DeleteRegular />}
        onClick={() => setConfirmOpen(true)}
        disabled={busy || deleting}
      >
        Delete
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(_, data) => setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete {selectedCount} {noun}</DialogTitle>
            <DialogContent>
              Deze {noun} {selectedCount === 1 ? 'will be' : 'will be'} hidden from this view.
              The purchase order remains unchanged in D365 and the row will not return on the next sync.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Delete...' : 'Delete'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default memo(PurchaseOrderBulkActionsBar);
