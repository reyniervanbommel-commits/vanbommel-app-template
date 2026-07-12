import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Radio,
  RadioGroup,
  makeStyles,
  shorthands,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
});

// Dialog voor "opslaan als nieuwe view" en "hernoemen". mode bepaalt de velden.
export default function PurchaseOrderSavedViewDialog({
  open,
  mode,
  canManageGlobal,
  initialName,
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [scope, setScope] = useState('personal');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName || '');
      setScope('personal');
      setIsDefault(false);
      setSaving(false);
      setError('');
    }
  }, [open, initialName]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Geef een naam op.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: trimmed, scope, isDefault });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }, [name, scope, isDefault, onSubmit, onOpenChange]);

  const title = mode === 'rename' ? 'View hernoemen' : 'Opslaan als nieuwe view';

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Naam" required>
                <Input
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder="Bijv. Openstaand deze week"
                />
              </Field>

              {mode === 'create' && canManageGlobal ? (
                <Field label="Zichtbaarheid">
                  <RadioGroup
                    layout="horizontal"
                    value={scope}
                    onChange={(_, data) => setScope(data.value)}
                  >
                    <Radio value="personal" label="Persoonlijk" />
                    <Radio value="global" label="Gedeeld (iedereen)" />
                  </RadioGroup>
                </Field>
              ) : null}

              {mode === 'create' ? (
                <Checkbox
                  checked={isDefault}
                  onChange={(_, data) => setIsDefault(Boolean(data.checked))}
                  label="Als standaard-view instellen"
                />
              ) : null}

              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
