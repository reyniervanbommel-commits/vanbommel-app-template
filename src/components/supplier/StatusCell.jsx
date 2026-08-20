import React, { useMemo } from 'react';
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
import StatusLabelsConflictResolver from './StatusLabelsConflictResolver';
import { useStatusLabelsEditor } from '../../hooks/useStatusLabelsEditor';
import {
  getStatusOptionByValue,
  resolveStatusCellColor,
} from '../../utils/statusColumnUtils';

const STATUS_TEXT_COLOR = '#ffffff';

const useStyles = makeStyles({
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    alignItems: 'stretch',
  },
  trigger: {
    width: '100%',
    height: '100%',
    minHeight: 0,
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
  const { normalizedOptions, mode, setMode, selection, editor, conflict } = useStatusLabelsEditor({
    value,
    options,
    onSave,
    onUpdateOptions,
    isAdmin,
  });
  const selectedOption = useMemo(() => getStatusOptionByValue(value, normalizedOptions), [value, normalizedOptions]);
  const backgroundColor = resolveStatusCellColor(value, normalizedOptions);
  const textColor = selectedOption ? STATUS_TEXT_COLOR : tokens.colorNeutralForeground3;

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

  let popoverContent;
  if (mode === 'select') {
    popoverContent = (
      <>
        <button
          type="button"
          className={mergeClasses(styles.optionButton, styles.emptyOption)}
          onClick={() => selection.handleSelect('')}
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
            onClick={() => selection.handleSelect(option.label)}
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
    );
  } else if (mode === 'conflict') {
    popoverContent = (
      <StatusLabelsConflictResolver
        conflicts={conflict.conflicts}
        remainingOptions={conflict.remainingOptions}
        reassignChoices={conflict.reassignChoices}
        onChangeChoice={conflict.setReassignChoice}
        onCancel={conflict.handleCancelConflict}
        onConfirm={conflict.handleConfirmConflict}
        saving={conflict.saving}
      />
    );
  } else {
    popoverContent = (
      <StatusLabelsEditor
        draftOptions={editor.draftOptions}
        labelDrafts={editor.labelDrafts}
        newLabel={editor.newLabel}
        setNewLabel={editor.setNewLabel}
        newColor={editor.newColor}
        setNewColor={editor.setNewColor}
        optionsSaving={editor.optionsSaving}
        onDone={() => setMode('select')}
        onAddLabel={editor.handleAddLabel}
        onRemoveOption={editor.handleRemoveDraftOption}
        onLabelInputChange={editor.handleLabelInputChange}
        onCommitLabelEdit={editor.commitLabelEdit}
        onColorChange={editor.handleColorChange}
      />
    );
  }

  const cellContent = (
    <div className={styles.wrapper}>
      <Popover open={selection.open} onOpenChange={(_, data) => selection.setOpen(!!data.open)} positioning="below-start" trapFocus>
        <PopoverTrigger disableButtonEnhancement>
          {triggerButton}
        </PopoverTrigger>
        <PopoverSurface
          className={mergeClasses(styles.popoverSurface, mode !== 'select' ? styles.popoverSurfaceEdit : undefined)}
          tabIndex={-1}
        >
          {popoverContent}
        </PopoverSurface>
      </Popover>
      {selection.saving ? (
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
