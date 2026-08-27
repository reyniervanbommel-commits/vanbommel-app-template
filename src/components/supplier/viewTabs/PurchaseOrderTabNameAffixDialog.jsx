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
  Input,
  makeStyles,
  shorthands,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    maxWidth: '420px',
  },
  affixField: {
    maxWidth: '168px',
  },
});

export default function PurchaseOrderTabNameAffixDialog({
  open,
  groupLabel = '',
  namePrefix = '',
  nameSuffix = '',
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const [prefix, setPrefix] = useState(namePrefix);
  const [suffix, setSuffix] = useState(nameSuffix);

  useEffect(() => {
    if (open) {
      setPrefix(namePrefix || '');
      setSuffix(nameSuffix || '');
    }
  }, [open, namePrefix, nameSuffix]);

  const handlePrefixChange = useCallback((_, data) => {
    setPrefix(data.value);
  }, []);

  const handleSuffixChange = useCallback((_, data) => {
    setSuffix(data.value);
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit({ namePrefix: prefix, nameSuffix: suffix });
    onOpenChange(false);
  }, [onOpenChange, onSubmit, prefix, suffix]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {groupLabel ? `Prefix and suffix · ${groupLabel}` : 'Prefix and suffix'}
          </DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field
                className={styles.affixField}
                label="Prefix"
                hint="Shown in front of the column value."
              >
                <Input value={prefix} onChange={handlePrefixChange} placeholder="e.g. Vendor" maxLength={40} />
              </Field>
              <Field
                className={styles.affixField}
                label="Suffix"
                hint="Shown after the column value."
              >
                <Input value={suffix} onChange={handleSuffixChange} placeholder="e.g. NL" maxLength={40} />
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
