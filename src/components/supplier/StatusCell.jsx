import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { EditRegular } from '@fluentui/react-icons';
import CellHistoryPopover from './CellHistoryPopover';
import StatusLabelsEditor from './StatusLabelsEditor';
import {
  STATUS_COLOR_PALETTE,
  getStatusOptionByValue,
  normalizeStatusOptions,
  resolveStatusCellColor,
} from '../../utils/statusColumnUtils';
import { purchaseOrderBoardRowHeight } from './purchaseOrderBoardLayout';

const STATUS_TEXT_COLOR = '#ffffff';

const useStyles = makeStyles({
  wrapper: {
    position: 'relative',
    width: '100%',
    minHeight: purchaseOrderBoardRowHeight,
    display: 'flex',
    alignItems: 'stretch',
  },
  trigger: {
    width: '100%',
    minHeight: purchaseOrderBoardRowHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.border('0'),
    ...shorthands.padding('4px', '8px'),
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ':hover': {
      filter: 'brightness(0.95)',
    },
  },
  popoverSurface: {
    width: '220px',
    ...shorthands.padding('8px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  popoverSurfaceEdit: {
    width: '280px',
    maxHeight: '420px',
    overflowY: 'auto',
  },
  optionButton: {
    width: '100%',
    minHeight: '32px',
    justifyContent: 'center',
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('0'),
    fontWeight: tokens.fontWeightMedium,
    cursor: 'pointer',
  },
  emptyOption: {
    backgroundColor: '#c4c4c4',
    color: tokens.colorNeutralForeground3,
  },
  footerButton: {
    justifyContent: 'flex-start',
    ...shorthands.padding('4px', '0'),
    minHeight: '28px',
  },
  savingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});

function createDraftOptions(options) {
  return normalizeStatusOptions(options).map((option) => ({ ...option }));
}

export default function StatusCell({
  value,
  options,
  onSave,
  onUpdateOptions,
  isAdmin = false,
  ariaLabel,
  cellKeys,
  hasHistory = false,
}) {
  const styles = useStyles();
  const normalizedOptions = useMemo(() => normalizeStatusOptions(options), [options]);
  const selectedOption = useMemo(() => getStatusOptionByValue(value, normalizedOptions), [value, normalizedOptions]);
  const backgroundColor = resolveStatusCellColor(value, normalizedOptions);
  const textColor = selectedOption ? STATUS_TEXT_COLOR : tokens.colorNeutralForeground3;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('select');
  const [saving, setSaving] = useState(false);
  const [draftOptions, setDraftOptions] = useState(() => createDraftOptions(normalizedOptions));
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(STATUS_COLOR_PALETTE[1]);
  const [optionsSaving, setOptionsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode('select');
      setDraftOptions(createDraftOptions(normalizedOptions));
      setNewLabel('');
      setNewColor(STATUS_COLOR_PALETTE[1]);
    }
  }, [open, normalizedOptions]);

  const handleSelect = useCallback(async (nextValue) => {
    const currentValue = selectedOption?.label || '';
    if (nextValue === currentValue) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextValue);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, [onSave, selectedOption?.label]);

  const handleApplyOptions = useCallback(async () => {
    if (!isAdmin || typeof onUpdateOptions !== 'function') return;
    const cleanedOptions = draftOptions
      .map((option) => ({ ...option, label: String(option.label || '').trim() }))
      .filter((option) => option.label);
    if (!cleanedOptions.length) return;
    setOptionsSaving(true);
    try {
      await onUpdateOptions(cleanedOptions);
      setMode('select');
      setOpen(false);
    } finally {
      setOptionsSaving(false);
    }
  }, [draftOptions, isAdmin, onUpdateOptions]);

  const triggerButton = (
    <button
      type="button"
      className={styles.trigger}
      style={{ backgroundColor, color: textColor }}
      aria-label={ariaLabel}
    >
      {selectedOption?.label || ''}
    </button>
  );

  const popoverContent = mode === 'select' ? (
    <>
      <button
        type="button"
        className={mergeClasses(styles.optionButton, styles.emptyOption)}
        onClick={() => handleSelect('')}
      >
        —
      </button>
      {normalizedOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className={styles.optionButton}
          style={{
            backgroundColor: option.color,
            color: STATUS_TEXT_COLOR,
          }}
          onClick={() => handleSelect(option.label)}
        >
          {option.label}
        </button>
      ))}
      {isAdmin && typeof onUpdateOptions === 'function' ? (
        <Button
          className={styles.footerButton}
          appearance="subtle"
          size="small"
          icon={<EditRegular />}
          onClick={() => setMode('edit')}
        >
          Edit labels
        </Button>
      ) : null}
    </>
  ) : (
    <StatusLabelsEditor
      draftOptions={draftOptions}
      setDraftOptions={setDraftOptions}
      newLabel={newLabel}
      setNewLabel={setNewLabel}
      newColor={newColor}
      setNewColor={setNewColor}
      onCancel={() => setMode('select')}
      onApply={handleApplyOptions}
      optionsSaving={optionsSaving}
    />
  );

  const cellContent = (
    <div className={styles.wrapper}>
      <Popover open={open} onOpenChange={(_, data) => setOpen(!!data.open)} positioning="below-start" trapFocus>
        <PopoverTrigger disableButtonEnhancement>
          {triggerButton}
        </PopoverTrigger>
        <PopoverSurface
          className={mergeClasses(styles.popoverSurface, mode === 'edit' ? styles.popoverSurfaceEdit : undefined)}
          tabIndex={-1}
        >
          {popoverContent}
        </PopoverSurface>
      </Popover>
      {saving ? (
        <span className={styles.savingOverlay} aria-hidden>
          <Spinner size="extra-tiny" />
        </span>
      ) : null}
    </div>
  );

  if (!cellKeys) return cellContent;

  return (
    <CellHistoryPopover cellKeys={cellKeys} dataType="status" hasHistory={hasHistory}>
      {cellContent}
    </CellHistoryPopover>
  );
}
