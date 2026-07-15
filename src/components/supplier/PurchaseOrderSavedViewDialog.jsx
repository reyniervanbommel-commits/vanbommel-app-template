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
      setError('Enter a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: trimmed, scope, isDefault });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [name, scope, isDefault, onSubmit, onOpenChange]);

  const title = mode === 'rename' ? 'Rename view' : 'Save as new view';

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Name" required>
                <Input
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder="e.g. Open this week"
                />
              </Field>

              {mode === 'create' && canManageGlobal ? (
                <Field label="Visibility">
                  <RadioGroup
                    layout="vertical"
                    value={scope}
                    onChange={(_, data) => setScope(data.value)}
                  >
                    <Radio value="personal" label="Personal" />
                    <Radio value="vendor" label="Vendor view (all suppliers)" />
                    <Radio value="global" label="Shared (staff only)" />
                  </RadioGroup>
                </Field>
              ) : null}

              {mode === 'create' ? (
                <Checkbox
                  checked={isDefault}
                  onChange={(_, data) => setIsDefault(Boolean(data.checked))}
                  label="Set as default view"
                />
              ) : null}

              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
