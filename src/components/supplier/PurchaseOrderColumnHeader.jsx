import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input,
  Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { EditRegular, LockClosedRegular, MoreVerticalRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: { width: '100%', minHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('4px') },
  labelWrap: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
  d365LabelWrap: { display: 'inline-flex', alignItems: 'center', lineHeight: 1.2, ...shorthands.gap('4px') },
  writeBackCloud: { width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 },
  customIcon: { color: tokens.colorBrandForeground1, fontSize: tokens.fontSizeBase200 },
  menuButton: { minWidth: '20px', width: '20px', height: '20px', ...shorthands.padding('0') },
  lockIcon: { marginLeft: '6px', color: tokens.colorNeutralForeground4, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1, marginTop: '8px' },
});

export default function PurchaseOrderColumnHeader({ column, onRename, onRemove, isAdmin, onToggleWriteback, showActionsMenu = true, autoEdit = false, onEditingDone }) {
  const styles = useStyles();
  const isCustom = column.source === 'custom';
  const writable = !!column.writableToD365;
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Inline hernoemen direct na "Kolom rechts toevoegen" (Monday-stijl): typ de naam
  // in de header, Enter/blur bevestigt, Escape laat de standaardnaam staan.
  const [inlineValue, setInlineValue] = useState(column.label);
  const inlineInputRef = useRef(null);
  useEffect(() => {
    if (autoEdit) setInlineValue(column.label);
  }, [autoEdit, column.label]);

  // Focus het veld zónder de tabel te scrollen (preventScroll). Het gericht scrollen
  // naar de nieuwe kolom gebeurt in de board-tabel, ná het verplaatsen.
  useEffect(() => {
    if (autoEdit && inlineInputRef.current) {
      inlineInputRef.current.focus({ preventScroll: true });
      inlineInputRef.current.select();
    }
  }, [autoEdit]);

  const commitInline = useCallback(async () => {
    const trimmed = inlineValue.trim();
    if (trimmed && trimmed !== column.label) {
      try { await onRename(column.id, trimmed); } catch { /* naam blijft ongewijzigd */ }
    }
    if (onEditingDone) onEditingDone();
  }, [inlineValue, column.label, column.id, onRename, onEditingDone]);

  const handleInlineKey = useCallback((event) => {
    if (event.key === 'Enter') { event.preventDefault(); commitInline(); }
    else if (event.key === 'Escape') { if (onEditingDone) onEditingDone(); }
  }, [commitInline, onEditingDone]);

  const openRename = useCallback(() => { setLabel(column.label); setError(''); setRenameOpen(true); }, [column.label]);
  const submitRename = useCallback(async () => {
    const trimmed = label.trim();
    if (!trimmed) return setError('Geef een kolomnaam op.');
    setBusy(true); setError('');
    try { await onRename(column.id, trimmed); setRenameOpen(false); } catch (err) { setError(err.message || 'Hernoemen mislukt.'); } finally { setBusy(false); }
  }, [label, onRename, column.id]);
  const submitRemove = useCallback(async () => {
    setBusy(true); setError('');
    try { await onRemove(column.id); setConfirmOpen(false); } catch (err) { setError(err.message || 'Verwijderen mislukt.'); } finally { setBusy(false); }
  }, [onRemove, column.id]);

  if (autoEdit) {
    return (
      <div className={styles.header}>
        <Input
          size="small"
          value={inlineValue}
          onChange={(_, data) => setInlineValue(data.value)}
          input={{ ref: inlineInputRef }}
          onBlur={commitInline}
          onKeyDown={handleInlineKey}
          onMouseDown={(event) => event.stopPropagation()}
          draggable={false}
          aria-label="Kolomnaam"
        />
      </div>
    );
  }

  const columnOptionsMenu = (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button size="small" appearance="subtle" className={styles.menuButton} icon={<MoreVerticalRegular />} aria-label={`Kolomopties voor ${column.label}`} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={openRename}>Hernoemen</MenuItem>
          <MenuItem onClick={() => { setError(''); setConfirmOpen(true); }}>Verwijderen</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  if (!isCustom) {
    const labelWithWriteBack = (
      <span className={styles.d365LabelWrap}>
        {writable ? (
          <Tooltip content="D365 sync ingeschakeld" relationship="label">
            <img className={styles.writeBackCloud} src="/d365-sync-cloud.png" alt="D365 sync" />
          </Tooltip>
        ) : null}
        <span>{column.label}</span>
      </span>
    );
    if (!isAdmin || !onToggleWriteback || !column.d365Field) return <div className={styles.header}>{labelWithWriteBack}</div>;
    if (column.writeBackAllowed === false) {
      return <div className={styles.header}><span className={styles.labelWrap}>{column.label}<Tooltip content="Niet terugschrijfbaar (sleutel of boekings-/systeemveld)" relationship="label"><LockClosedRegular className={styles.lockIcon} /></Tooltip></span></div>;
    }
    if (!showActionsMenu) {
      return <div className={styles.header}>{labelWithWriteBack}</div>;
    }
    return (
      <div className={styles.header}>
        {labelWithWriteBack}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button size="small" appearance="subtle" className={styles.menuButton} icon={<MoreVerticalRegular />} aria-label={`Write-back-opties voor ${column.label}`} />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => onToggleWriteback(column.id, !writable)}>{writable ? 'Write-back uitzetten' : 'Write-back toestaan'}</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    );
  }

  if (!showActionsMenu) {
    return (
      <div className={styles.header}>
        <span className={styles.labelWrap}><EditRegular className={styles.customIcon} title="Eigen kolom" />{column.label}</span>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <span className={styles.labelWrap}><EditRegular className={styles.customIcon} title="Eigen kolom" />{column.label}</span>
      {columnOptionsMenu}

      <Dialog open={renameOpen} onOpenChange={(_, data) => !busy && setRenameOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Kolom hernoemen</DialogTitle>
            <DialogContent>
              <Field label="Naam" required validationState={error ? 'error' : 'none'} validationMessage={error || undefined}>
                <Input value={label} onChange={(_, data) => setLabel(data.value)} />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRenameOpen(false)} disabled={busy}>Annuleren</Button>
              <Button appearance="primary" onClick={submitRename} disabled={busy}>{busy ? 'Opslaan...' : 'Opslaan'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(_, data) => !busy && setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Kolom verwijderen</DialogTitle>
            <DialogContent>
              Kolom &quot;{column.label}&quot; verwijderen? De ingevoerde waarden blijven bewaard en de kolom kan later opnieuw worden toegevoegd.
              {error ? <div className={styles.error}>{error}</div> : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>Annuleren</Button>
              <Button appearance="primary" onClick={submitRemove} disabled={busy}>{busy ? 'Verwijderen...' : 'Verwijderen'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
