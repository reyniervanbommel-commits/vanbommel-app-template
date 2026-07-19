import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Input,
  Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import PurchaseOrderColumnHeaderDialogs from './PurchaseOrderColumnHeaderDialogs';
import {
  ArrowClockwiseRegular,
  CalendarLtrRegular,
  CheckmarkRegular,
  Chat24Regular,
  CloudRegular,
  EditRegular,
  HistoryRegular,
  LinkRegular,
  MoreVerticalRegular,
  NumberSymbolRegular,
  PaintBrushRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: { width: '100%', minWidth: 0, maxWidth: '100%', minHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('4px') },
  labelWrap: { display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', flex: 1, ...shorthands.gap('4px') },
  d365LabelWrap: { display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', flex: 1, lineHeight: 1.2, ...shorthands.gap('4px') },
  labelText: { minWidth: 0, maxWidth: '100%', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  writeBackCloud: { width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 },
  customIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  formulaTypeIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    textAlign: 'center',
    flexShrink: 0,
  },
  indicatorIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  conditionalFormattingIndicator: {
    color: tokens.colorPaletteDarkOrangeForeground2,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  menuButton: { minWidth: '20px', width: '20px', height: '20px', ...shorthands.padding('0') },
  error: { color: tokens.colorPaletteRedForeground1, marginTop: '8px' },
});

export default function PurchaseOrderColumnHeader({
  column,
  onRename,
  onRemove,
  isAdmin,
  onToggleWriteback,
  showActionsMenu = true,
  autoEdit = false,
  onEditingDone,
  showFilterIndicator = false,
  showConditionalFormattingIndicator = false,
  showSumIndicator = false,
  showConnectionIndicator = false,
  showTrackChangesIndicator = false,
}) {
  const styles = useStyles();
  const isCustom = column.source === 'custom';
  const writable = !!column.writableToD365;
  const isFormulaColumn = Boolean(String(column.formulaExpr || '').trim());
  const customTypeKey = String(column.dataType || 'text').trim().toLowerCase();
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
    if (!trimmed) return setError('Enter a column name.');
    setBusy(true); setError('');
    try { await onRename(column.id, trimmed); setRenameOpen(false); } catch (err) { setError(err.message || 'Rename failed.'); } finally { setBusy(false); }
  }, [label, onRename, column.id]);
  const submitRemove = useCallback(async () => {
    setBusy(true); setError('');
    try { await onRemove(column.id); setConfirmOpen(false); } catch (err) { setError(err.message || 'Delete failed.'); } finally { setBusy(false); }
  }, [onRemove, column.id]);
  const trackChangesIndicator = showTrackChangesIndicator ? (
    <Tooltip content="Track changes active" relationship="label">
      <HistoryRegular className={styles.indicatorIcon} />
    </Tooltip>
  ) : null;
  const connectionIndicator = showConnectionIndicator ? (
    <Tooltip content="Connected column" relationship="label">
      <LinkRegular className={styles.indicatorIcon} />
    </Tooltip>
  ) : null;
  const showCustomTypeIndicator = !showConnectionIndicator;
  const renderCustomTypeIcon = () => {
    if (isFormulaColumn) return <span className={styles.formulaTypeIcon} aria-hidden>fx</span>;
    switch (customTypeKey) {
      case 'number': return <NumberSymbolRegular className={styles.customIcon} title="Number column" />;
      case 'date': return <ArrowClockwiseRegular className={styles.customIcon} title="Date column" />;
      case 'date_period': return <CalendarLtrRegular className={styles.customIcon} title="Date W/M column" />;
      case 'boolean': return <CheckmarkRegular className={styles.customIcon} title="Yes/No column" />;
      case 'status': return <span className={styles.formulaTypeIcon} title="Status column">●</span>;
      case 'remarks': return <Chat24Regular className={styles.customIcon} title="Remarks column" />;
      case 'select': return <TextBulletList20Regular className={styles.customIcon} title="Choice list column" />;
      case 'text':
      default: return <EditRegular className={styles.customIcon} title="Text column" />;
    }
  };

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
          aria-label="Column name"
        />
      </div>
    );
  }

  const columnOptionsMenu = (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button size="small" appearance="subtle" className={styles.menuButton} icon={<MoreVerticalRegular />} aria-label={`Column options for ${column.label}`} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={openRename}>Rename</MenuItem>
          <MenuItem onClick={() => { setError(''); setConfirmOpen(true); }}>Delete</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  if (!isCustom) {
    const labelWithWriteBack = (
      <span className={styles.d365LabelWrap}>
        <Tooltip content={writable ? 'D365 sync enabled' : 'D365 source column'} relationship="label">
          {writable
            ? <img className={styles.writeBackCloud} src="/d365-sync-cloud.png" alt="D365 sync" />
            : <CloudRegular className={styles.indicatorIcon} />}
        </Tooltip>
        {connectionIndicator}
        {showConditionalFormattingIndicator ? (
          <Tooltip content="Conditional formatting active" relationship="label">
            <PaintBrushRegular className={styles.conditionalFormattingIndicator} />
          </Tooltip>
        ) : null}
        {showSumIndicator ? (
          <Tooltip content="Column sum enabled" relationship="label">
            <NumberSymbolRegular className={styles.indicatorIcon} />
          </Tooltip>
        ) : null}
        {trackChangesIndicator}
        <span className={styles.labelText}>{column.label}</span>
      </span>
    );
    if (!isAdmin || !onToggleWriteback || !column.d365Field) return <div className={styles.header}>{labelWithWriteBack}</div>;
    if (column.writeBackAllowed === false) {
      return <div className={styles.header}>{labelWithWriteBack}</div>;
    }
    if (!showActionsMenu) {
      return <div className={styles.header}>{labelWithWriteBack}</div>;
    }
    return (
      <div className={styles.header}>
        {labelWithWriteBack}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button size="small" appearance="subtle" className={styles.menuButton} icon={<MoreVerticalRegular />} aria-label={`Write-back options for ${column.label}`} />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => onToggleWriteback(column.id, !writable)}>{writable ? 'Disable write-back' : 'Allow write-back'}</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <span className={styles.labelWrap}>
        {showCustomTypeIndicator ? (
          <Tooltip content={isFormulaColumn ? 'Formula column' : 'Custom column'} relationship="label">
            {renderCustomTypeIcon()}
          </Tooltip>
        ) : null}
        {connectionIndicator}
        {showConditionalFormattingIndicator ? (
          <Tooltip content="Conditional formatting active" relationship="label">
            <PaintBrushRegular className={styles.conditionalFormattingIndicator} />
          </Tooltip>
        ) : null}
        {showSumIndicator ? (
          <Tooltip content="Column sum enabled" relationship="label">
            <NumberSymbolRegular className={styles.indicatorIcon} />
          </Tooltip>
        ) : null}
        {trackChangesIndicator}
        <span className={styles.labelText}>{column.label}</span>
      </span>
      {showActionsMenu ? columnOptionsMenu : null}

      <PurchaseOrderColumnHeaderDialogs
        columnLabel={column.label}
        errorClassName={styles.error}
        renameOpen={renameOpen}
        setRenameOpen={setRenameOpen}
        label={label}
        setLabel={setLabel}
        submitRename={submitRename}
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        submitRemove={submitRemove}
        busy={busy}
        error={error}
      />
    </div>
  );
}
