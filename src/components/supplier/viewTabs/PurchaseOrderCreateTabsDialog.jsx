import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Select,
  makeStyles,
  shorthands,
} from '@fluentui/react-components';
import ColorPalettePicker from '../../shared/ColorPalettePicker';
import { nextGroupColor, preferredSplitColumnKey } from '../../../utils/viewTabs';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    maxWidth: '520px',
  },
  prefixField: {
    maxWidth: '168px',
  },
});

export default function PurchaseOrderCreateTabsDialog({
  open,
  columns = [],
  groups = [],
  uniqueValueCount,
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const defaultKey = useMemo(() => preferredSplitColumnKey(columns), [columns]);
  const [columnKey, setColumnKey] = useState(defaultKey);
  const [color, setColor] = useState(() => nextGroupColor(groups));
  const [namePrefix, setNamePrefix] = useState('');

  useEffect(() => {
    if (open) {
      setColumnKey(defaultKey);
      setColor(nextGroupColor(groups));
      const existing = groups.find((group) => group.columnKey === defaultKey);
      setNamePrefix(existing?.namePrefix || '');
    }
  }, [open, defaultKey, groups]);

  const handleColumnChange = useCallback((event) => {
    const nextKey = event.target.value;
    setColumnKey(nextKey);
    const existing = groups.find((group) => group.columnKey === nextKey);
    if (existing?.namePrefix) setNamePrefix(existing.namePrefix);
  }, [groups]);

  const handlePrefixChange = useCallback((_, data) => {
    setNamePrefix(data.value);
  }, []);

  const count = columnKey && uniqueValueCount ? uniqueValueCount(columnKey) : 0;

  const handleSubmit = useCallback(async () => {
    if (!columnKey) return;
    await onSubmit({ columnKey, color, namePrefix });
    onOpenChange(false);
  }, [columnKey, color, namePrefix, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create tabs from a column</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Column" hint="One tab per unique value in the current view.">
                <Select value={columnKey} onChange={handleColumnChange}>
                  {columns.map((column) => (
                    <option key={column.key} value={column.key}>{column.label || column.key}</option>
                  ))}
                </Select>
              </Field>
              <Field
                className={styles.prefixField}
                label="Name prefix"
                hint="Shown in front of the column value on each tab."
              >
                <Input
                  value={namePrefix}
                  onChange={handlePrefixChange}
                  placeholder="e.g. Vendor"
                  maxLength={40}
                />
              </Field>
              <Field label="Group color">
                <ColorPalettePicker
                  selectedColor={color}
                  onSelect={setColor}
                  layout="grid"
                  ariaLabel="Group color"
                />
              </Field>
              <Field hint={`${count} tab${count === 1 ? '' : 's'} will be added (existing values are skipped).`} />
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>Skip</Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={!columnKey || count === 0}>
              Create tabs
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
