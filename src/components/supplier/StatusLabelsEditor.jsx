import React, { useCallback } from 'react';
import {
  Button,
  Input,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../shared/ColorPalettePicker';

const useStyles = makeStyles({
  editItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    ...shorthands.gap('6px'),
    ...shorthands.padding('4px', '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  editItemRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },
  labelInput: {
    width: '100%',
    flexGrow: 1,
  },
  newLabelSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    ...shorthands.gap('6px'),
    ...shorthands.padding('8px', '0', '4px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    marginTop: '4px',
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
});

export default function StatusLabelsEditor({
  draftOptions,
  labelDrafts,
  newLabel,
  setNewLabel,
  newColor,
  setNewColor,
  optionsSaving,
  onDone,
  onAddLabel,
  onRemoveOption,
  onLabelInputChange,
  onCommitLabelEdit,
  onColorChange,
}) {
  const styles = useStyles();

  const handleNewLabelKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAddLabel();
    }
  }, [onAddLabel]);

  const handleLabelKeyDown = useCallback((event, optionId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommitLabelEdit(optionId);
    }
  }, [onCommitLabelEdit]);

  return (
    <>
      {draftOptions.map((option, index) => (
        <div key={option.id} className={styles.editItem}>
          <div className={styles.editItemRow}>
            <Input
              className={styles.labelInput}
              size="small"
              value={labelDrafts[option.id] ?? option.label}
              onChange={(_, data) => onLabelInputChange(option.id, data.value)}
              onBlur={() => onCommitLabelEdit(option.id)}
              onKeyDown={(event) => handleLabelKeyDown(event, option.id)}
            />
            <Button
              appearance="subtle"
              size="small"
              icon={<DeleteRegular />}
              aria-label={`Delete label ${option.label}`}
              disabled={draftOptions.length <= 1}
              title={draftOptions.length <= 1 ? 'At least one status label is required' : 'Delete label'}
              onClick={() => onRemoveOption(index)}
            />
          </div>
          <ColorPalettePicker
            selectedColor={option.color}
            onSelect={(color) => onColorChange(index, color)}
            ariaLabel="Status color"
          />
        </div>
      ))}
      <div className={styles.newLabelSection}>
        <Input
          className={styles.labelInput}
          size="small"
          placeholder="Add label..."
          value={newLabel}
          onChange={(_, data) => setNewLabel(data.value)}
          onKeyDown={handleNewLabelKeyDown}
        />
        <ColorPalettePicker selectedColor={newColor} onSelect={setNewColor} ariaLabel="Status color" />
        <Button
          appearance="subtle"
          size="small"
          icon={<AddRegular />}
          onClick={onAddLabel}
          disabled={!newLabel.trim()}
        >
          New label
        </Button>
      </div>
      <div className={styles.editActions}>
        <Button appearance="primary" size="small" onClick={onDone} disabled={optionsSaving}>
          {optionsSaving ? 'Saving...' : 'Done'}
        </Button>
      </div>
    </>
  );
}
