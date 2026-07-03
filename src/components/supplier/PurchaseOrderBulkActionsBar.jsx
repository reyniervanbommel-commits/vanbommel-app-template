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

// Verschijnt zodra er rijen geselecteerd zijn. "Verwijderen" opent een bevestiging;
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

  const noun = selectedCount === 1 ? 'rij' : 'rijen';

  return (
    <div className={styles.bar}>
      <span className={styles.count}>{selectedCount} geselecteerd</span>
      <Button
        size="small"
        appearance="subtle"
        icon={<DismissRegular />}
        onClick={onClear}
        disabled={busy || deleting}
      >
        Deselecteren
      </Button>
      <Button
        size="small"
        appearance="primary"
        icon={<DeleteRegular />}
        onClick={() => setConfirmOpen(true)}
        disabled={busy || deleting}
      >
        Verwijderen
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(_, data) => setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{selectedCount} {noun} verwijderen</DialogTitle>
            <DialogContent>
              Deze {noun} {selectedCount === 1 ? 'wordt' : 'worden'} uit dit overzicht verborgen.
              De inkooporder blijft ongewijzigd in D365 en de rij komt niet terug bij een volgende synchronisatie.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                Annuleren
              </Button>
              <Button appearance="primary" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Verwijderen...' : 'Verwijderen'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default memo(PurchaseOrderBulkActionsBar);
