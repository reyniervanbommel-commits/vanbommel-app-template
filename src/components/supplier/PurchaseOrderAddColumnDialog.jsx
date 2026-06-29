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
  { value: 'text', label: 'Tekst' },
  { value: 'number', label: 'Getal' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja/nee' },
  { value: 'select', label: 'Keuzelijst' },
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
      setError('Geef een kolomnaam op.');
      return;
    }
    let options;
    if (dataType === 'select') {
      options = optionsText
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (!options.length) {
        setError('Geef minimaal één optie op voor een keuzelijst.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      await onAdd({ label: trimmedLabel, level, dataType, options });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Kolom toevoegen mislukt.');
    } finally {
      setSaving(false);
    }
  }, [label, level, dataType, optionsText, onAdd, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Kolom toevoegen</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Naam" required>
                <Input
                  value={label}
                  onChange={(_, data) => setLabel(data.value)}
                  placeholder="Bijv. Opmerking"
                />
              </Field>

              <Field label="Niveau">
                <RadioGroup
                  layout="horizontal"
                  value={level}
                  onChange={(_, data) => setLevel(data.value)}
                >
                  <Radio value="header" label="Order (header)" />
                  <Radio value="line" label="Regel (line)" />
                </RadioGroup>
              </Field>

              <Field label="Datatype">
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
                  label="Opties (komma-gescheiden)"
                  hint="Bijv. Open, In behandeling, Afgerond"
                >
                  <Input
                    value={optionsText}
                    onChange={(_, data) => setOptionsText(data.value)}
                    placeholder="Optie 1, Optie 2, Optie 3"
                  />
                </Field>
              ) : null}

              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
