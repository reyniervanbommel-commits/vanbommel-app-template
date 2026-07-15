import React, { useCallback } from 'react';
import {
  Button,
  Input,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../shared/ColorPalettePicker';
import { STATUS_COLOR_PALETTE } from '../../utils/statusColumnUtils';

const useStyles = makeStyles({
  editItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    ...shorthands.gap('6px'),
    ...shorthands.padding('4px', '0'),
  },
  labelInput: {
    width: '100%',
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
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    marginTop: '4px',
  },
});

export default function StatusLabelsEditor({
  draftOptions,
  setDraftOptions,
  newLabel,
  setNewLabel,
  newColor,
  setNewColor,
  onCancel,
  onApply,
  optionsSaving,
}) {
  const styles = useStyles();

  const handleAddLabel = useCallback(() => {
    const label = newLabel.trim();
    if (!label) return;
    const duplicate = draftOptions.some(
      (option) => option.label.trim().toLowerCase() === label.toLowerCase(),
    );
    if (duplicate) return;
    setDraftOptions((current) => [
      ...current,
      { id: `status_${Date.now()}`, label, color: newColor },
    ]);
    setNewLabel('');
    setNewColor(STATUS_COLOR_PALETTE[(draftOptions.length + 1) % STATUS_COLOR_PALETTE.length]);
  }, [draftOptions, newColor, newLabel, setDraftOptions, setNewColor, setNewLabel]);

  const handleNewLabelKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddLabel();
    }
  }, [handleAddLabel]);

  return (
    <>
      {draftOptions.map((option, index) => (
        <div key={option.id} className={styles.editItem}>
          <Input
            className={styles.labelInput}
            size="small"
            value={option.label}
            onChange={(_, data) => {
              const nextLabel = data.value;
              setDraftOptions((current) => current.map((entry, entryIndex) => (
                entryIndex === index ? { ...entry, label: nextLabel } : entry
              )));
            }}
          />
          <ColorPalettePicker
            selectedColor={option.color}
            onSelect={(color) => {
              setDraftOptions((current) => current.map((entry, entryIndex) => (
                entryIndex === index ? { ...entry, color } : entry
              )));
            }}
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
          onClick={handleAddLabel}
          disabled={!newLabel.trim()}
        >
          New label
        </Button>
      </div>
      <div className={styles.editActions}>
        <Button appearance="subtle" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button appearance="primary" size="small" onClick={onApply} disabled={optionsSaving}>
          {optionsSaving ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </>
  );
}
