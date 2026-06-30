import React, { useCallback, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { MoreVerticalRegular, EditRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    justifyContent: 'space-between',
  },
  labelWrap: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },
  // Subtiel onderscheid: eigen (bewerkbare) kolommen krijgen een potlood-icoon.
  customIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  menuButton: {
    minWidth: '20px',
    width: '20px',
    height: '20px',
    ...shorthands.padding('0'),
  },
  rowBadge: {
    marginLeft: '6px',
  },
});

/**
 * Kolomheader voor de PO-board en subitems. Toont het label; voor eigen (custom)
 * kolommen een menu met Hernoemen / Verwijderen (soft-delete, met bevestiging).
 * D365-kolommen tonen alleen het label (read-only referentie).
 */
export default function PurchaseOrderColumnHeader({ column, onRename, onRemove, isAdmin, onToggleWriteback }) {
  const styles = useStyles();
  const isCustom = column.source === 'custom';
  const writable = !!column.writableToD365;
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openRename = useCallback(() => {
    setLabel(column.label);
    setError('');
    setRenameOpen(true);
  }, [column.label]);

  const submitRename = useCallback(async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Geef een kolomnaam op.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onRename(column.id, trimmed);
      setRenameOpen(false);
    } catch (err) {
      setError(err.message || 'Hernoemen mislukt.');
    } finally {
      setBusy(false);
    }
  }, [label, onRename, column.id]);

  const submitRemove = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await onRemove(column.id);
      setConfirmOpen(false);
    } catch (err) {
      setError(err.message || 'Verwijderen mislukt.');
    } finally {
      setBusy(false);
    }
  }, [onRemove, column.id]);

  if (!isCustom) {
    // D365-kolom. Toon een write-back-badge indien aan; admin kan het via een menu togglen.
    const badge = writable ? (
      <Badge className={styles.rowBadge} color="brand" appearance="tint" size="small">write-back</Badge>
    ) : null;
    if (!isAdmin || !onToggleWriteback || !column.d365Field) {
      return <span className={styles.labelWrap}>{column.label}{badge}</span>;
    }
    return (
      <div className={styles.header}>
        <span className={styles.labelWrap}>{column.label}{badge}</span>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button size="small" appearance="subtle" className={styles.menuButton} icon={<MoreVerticalRegular />} aria-label={`Write-back-opties voor ${column.label}`} />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => onToggleWriteback(column.id, !writable)}>
                {writable ? 'Write-back uitzetten' : 'Write-back toestaan'}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <span className={styles.labelWrap}>
        <EditRegular className={styles.customIcon} title="Eigen kolom" />
        {column.label}
      </span>

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            size="small"
            appearance="subtle"
            className={styles.menuButton}
            icon={<MoreVerticalRegular />}
            aria-label={`Kolomopties voor ${column.label}`}
          />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem onClick={openRename}>Hernoemen</MenuItem>
            <MenuItem onClick={() => { setError(''); setConfirmOpen(true); }}>Verwijderen</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>

      <Dialog open={renameOpen} onOpenChange={(_, data) => !busy && setRenameOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Kolom hernoemen</DialogTitle>
            <DialogContent>
              <Field
                label="Naam"
                required
                validationState={error ? 'error' : 'none'}
                validationMessage={error || undefined}
              >
                <Input value={label} onChange={(_, data) => setLabel(data.value)} />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRenameOpen(false)} disabled={busy}>
                Annuleren
              </Button>
              <Button appearance="primary" onClick={submitRename} disabled={busy}>
                {busy ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(_, data) => !busy && setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Kolom verwijderen</DialogTitle>
            <DialogContent>
              Kolom &quot;{column.label}&quot; verwijderen? De ingevoerde waarden blijven bewaard en
              de kolom kan later opnieuw worden toegevoegd.
              {error ? <div style={{ color: tokens.colorPaletteRedForeground1, marginTop: '8px' }}>{error}</div> : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>
                Annuleren
              </Button>
              <Button appearance="primary" onClick={submitRemove} disabled={busy}>
                {busy ? 'Verwijderen...' : 'Verwijderen'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
