import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  makeStyles,
  Option,
  Radio,
  RadioGroup,
  shorthands,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
});

// Datatypes met Nederlandse labels; value komt overeen met het API-contract.
const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Choice list' },
];

const DATA_TYPE_LABELS = Object.fromEntries(DATA_TYPES.map((t) => [t.value, t.label]));

/**
 * Dialog om een nieuwe eigen kolom toe te voegen (header- of regelniveau).
 */
export default function PurchaseOrderAddColumnDialog({ open, onOpenChange, onAdd }) {
  const styles = useStyles();
  const [label, setLabel] = useState('');
  const [level, setLevel] = useState('header');
  const [dataType, setDataType] = useState('text');
  const [optionsText, setOptionsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('');
      setLevel('header');
      setDataType('text');
      setOptionsText('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Enter a column name.');
      return;
    }
    let options;
    if (dataType === 'select') {
      options = optionsText
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (!options.length) {
        setError('Enter at least one option for a choice list.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      await onAdd({ label: trimmedLabel, level, dataType, options });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to add column.');
    } finally {
      setSaving(false);
    }
  }, [label, level, dataType, optionsText, onAdd, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add column</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Name" required>
                <Input
                  value={label}
                  onChange={(_, data) => setLabel(data.value)}
                  placeholder="e.g. Comment"
                />
              </Field>

              <Field label="Level">
                <RadioGroup
                  layout="horizontal"
                  value={level}
                  onChange={(_, data) => setLevel(data.value)}
                >
                  <Radio value="header" label="Order (header)" />
                  <Radio value="line" label="Line" />
                </RadioGroup>
              </Field>

              <Field label="Data type">
                <Dropdown
                  value={DATA_TYPE_LABELS[dataType]}
                  selectedOptions={[dataType]}
                  onOptionSelect={(_, data) => setDataType(data.optionValue)}
                >
                  {DATA_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              {dataType === 'select' ? (
                <Field
                  label="Options (comma-separated)"
                  hint="e.g. Open, In progress, Completed"
                >
                  <Input
                    value={optionsText}
                    onChange={(_, data) => setOptionsText(data.value)}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </Field>
              ) : null}

              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Adding...' : 'Add'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
