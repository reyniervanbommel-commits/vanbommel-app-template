import React, { useCallback, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  Field, Input, Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalM) },
  yearInput: { width: '104px' },
  weekInput: { width: '84px' },
  qtyInput: { width: '140px' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export default function RccpCapacityEditor({ readOnly, onSaved }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    vendorAccount: '',
    periodYear: new Date().getFullYear(),
    isoWeek: 1,
    capacityCategory: '',
    availableQty: 0,
  });

  const update = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await apiRequest('/rccp/capacity', {
        method: 'POST',
        body: {
          ...form,
          periodYear: Number(form.periodYear),
          isoWeek: Number(form.isoWeek),
          availableQty: Number(form.availableQty),
        },
      });
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save capacity');
    } finally {
      setSaving(false);
    }
  }, [form, onSaved]);

  return (
    <>
      <Button appearance="secondary" icon={<Add24Regular />} disabled={readOnly} onClick={() => setOpen(true)}>
        Add capacity
      </Button>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add capacity record</DialogTitle>
            <DialogContent className={styles.body}>
              <Field label="Vendor code">
                <Input value={form.vendorAccount} onChange={(e) => update('vendorAccount', e.target.value)} />
              </Field>
              <Field label="Year">
                <Input className={styles.yearInput} type="number" value={String(form.periodYear)} onChange={(e) => update('periodYear', e.target.value)} />
              </Field>
              <Field label="ISO week">
                <Input className={styles.weekInput} type="number" min={1} max={53} value={String(form.isoWeek)} onChange={(e) => update('isoWeek', e.target.value)} />
              </Field>
              <Field label="Capacity category">
                <Input value={form.capacityCategory} onChange={(e) => update('capacityCategory', e.target.value)} />
              </Field>
              <Field label="Available quantity">
                <Input className={styles.qtyInput} type="number" value={String(form.availableQty)} onChange={(e) => update('availableQty', e.target.value)} />
              </Field>
              {error && <Text className={styles.error}>{error}</Text>}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="tiny" /> : 'Save'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
