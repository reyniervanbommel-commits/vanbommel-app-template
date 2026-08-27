import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
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
    maxWidth: '480px',
  },
});

export default function PurchaseOrderSaveTabsDialog({
  open,
  groupLabel,
  confirmLabel = 'Save',
  title = 'Save tab changes',
  fieldLabel = 'What should be saved?',
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const [scope, setScope] = useState('tab');

  useEffect(() => {
    if (open) setScope('tab');
  }, [open]);

  const handleSubmit = useCallback(async () => {
    await onSubmit(scope);
    onOpenChange(false);
  }, [onSubmit, onOpenChange, scope]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label={fieldLabel}>
                <RadioGroup value={scope} onChange={(_, data) => setScope(data.value)}>
                  <Radio value="tab" label="This tab only" />
                  <Radio
                    value="group"
                    label={groupLabel
                      ? `All tabs with the same ${groupLabel} filter`
                      : 'All tabs with the same main filter'}
                  />
                </RadioGroup>
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button appearance="primary" onClick={handleSubmit}>{confirmLabel}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
