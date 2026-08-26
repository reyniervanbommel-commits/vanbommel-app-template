import React, { useCallback, useState } from 'react';
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
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const [scope, setScope] = useState('tab');

  const handleSubmit = useCallback(async () => {
    await onSubmit(scope);
    onOpenChange(false);
  }, [onSubmit, onOpenChange, scope]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Save tab changes</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="What should be saved?">
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
            <Button appearance="primary" onClick={handleSubmit}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
