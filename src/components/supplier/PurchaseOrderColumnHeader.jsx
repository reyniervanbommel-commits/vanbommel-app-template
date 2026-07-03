import React, { useCallback, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input,
  Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { CloudRegular, EditRegular, LockClosedRegular, MoreVerticalRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('4px') },
  labelWrap: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
  d365LabelWrap: { position: 'relative', display: 'inline-flex', alignItems: 'center', lineHeight: 1.2 },
  writeBackCloud: { position: 'absolute', top: '-8px', right: '-10px', color: tokens.colorBrandForeground1, fontSize: tokens.fontSizeBase400 },
  customIcon: { color: tokens.colorBrandForeground1, fontSize: tokens.fontSizeBase200 },
  menuButton: { minWidth: '20px', width: '20px', height: '20px', ...shorthands.padding('0') },
  draggableHeader: { cursor: 'grab', transitionProperty: 'transform, opacity, box-shadow, background-color', transitionDuration: '150ms', transitionTimingFunction: 'ease' },
  draggingHeader: { cursor: 'grabbing', opacity: 0.78, transform: 'scale(1.015)', boxShadow: `0 10px 24px ${tokens.colorNeutralShadowAmbient}` },
  dropBefore: { '::before': { content: '""', position: 'absolute', left: '-1px', top: '4px', bottom: '4px', width: '3px', borderRadius: '3px', backgroundColor: tokens.colorBrandStroke1, boxShadow: `0 0 0 2px ${tokens.colorBrandBackground2}`, zIndex: 2 } },
  dropAfter: { '::after': { content: '""', position: 'absolute', right: '-1px', top: '4px', bottom: '4px', width: '3px', borderRadius: '3px', backgroundColor: tokens.colorBrandStroke1, boxShadow: `0 0 0 2px ${tokens.colorBrandBackground2}`, zIndex: 2 } },
  lockIcon: { marginLeft: '6px', color: tokens.colorNeutralForeground4, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1, marginTop: '8px' },
});

export default function PurchaseOrderColumnHeader({ column, onRename, onRemove, isAdmin, onToggleWriteback, onMoveColumn, reorderBusy = false }) {
  const styles = useStyles();
  const isCustom = column.source === 'custom';
  const writable = !!column.writableToD365;
  const canDrag = typeof onMoveColumn === 'function' && !reorderBusy;
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState('before');
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragStart = useCallback((event) => {
    if (!canDrag) return;
    setIsDragging(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', column.key);
  }, [canDrag, column.key]);
  const handleDragOver = useCallback((event) => {
    if (!canDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const nextDropPosition = (event.clientX - rect.left) > (rect.width / 2) ? 'after' : 'before';
    if (!dragOver) setDragOver(true);
    if (dropPosition !== nextDropPosition) setDropPosition(nextDropPosition);
  }, [canDrag, dragOver, dropPosition]);
  const resetDragTarget = useCallback(() => {
    if (dragOver) setDragOver(false);
    if (dropPosition !== 'before') setDropPosition('before');
  }, [dragOver, dropPosition]);
  const handleDragLeave = useCallback(() => resetDragTarget(), [resetDragTarget]);
  const handleDragEnd = useCallback(() => {
    if (isDragging) setIsDragging(false);
    resetDragTarget();
  }, [isDragging, resetDragTarget]);
  const handleDrop = useCallback(async (event) => {
    if (!canDrag || !onMoveColumn) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const dropAt = (event.clientX - rect.left) > (rect.width / 2) ? 'after' : 'before';
    const sourceKey = String(event.dataTransfer.getData('text/plain') || '');
    resetDragTarget();
    if (!sourceKey || sourceKey === column.key) return;
    await onMoveColumn(sourceKey, column.key, dropAt);
  }, [canDrag, onMoveColumn, column.key, resetDragTarget]);

  const headerClassName = [styles.header, canDrag ? styles.draggableHeader : '', isDragging ? styles.draggingHeader : '', dragOver && dropPosition === 'before' ? styles.dropBefore : '', dragOver && dropPosition === 'after' ? styles.dropAfter : ''].filter(Boolean).join(' ');
  const dragProps = { draggable: canDrag, onDragStart: handleDragStart, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDragEnd: handleDragEnd, onDrop: handleDrop };
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
          <Tooltip content="Write-back enabled" relationship="label">
            <CloudRegular className={styles.writeBackCloud} />
          </Tooltip>
        ) : null}
        <span>{column.label}</span>
      </span>
    );
    if (!isAdmin || !onToggleWriteback || !column.d365Field) return <div className={headerClassName} {...dragProps}>{labelWithWriteBack}</div>;
    if (column.writeBackAllowed === false) {
      return <div className={headerClassName} {...dragProps}><span className={styles.labelWrap}>{column.label}<Tooltip content="Niet terugschrijfbaar (sleutel of boekings-/systeemveld)" relationship="label"><LockClosedRegular className={styles.lockIcon} /></Tooltip></span></div>;
    }
    return (
      <div className={headerClassName} {...dragProps}>
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

  return (
    <div className={headerClassName} {...dragProps}>
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
