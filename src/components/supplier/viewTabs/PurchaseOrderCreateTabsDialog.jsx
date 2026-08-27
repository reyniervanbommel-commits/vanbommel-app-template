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
  MessageBar,
  MessageBarBody,
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

const TAB_COUNT_WARNING = 10;

export default function PurchaseOrderCreateTabsDialog({
  open,
  columns = [],
  groups = [],
  uniqueValueCount,
  initialColumnKey = '',
  onOpenChange,
  onSubmit,
}) {
  const styles = useStyles();
  const defaultKey = useMemo(
    () => initialColumnKey || preferredSplitColumnKey(columns),
    [columns, initialColumnKey]
  );
  const [columnKey, setColumnKey] = useState(defaultKey);
  const [color, setColor] = useState(() => nextGroupColor(groups));
  const [namePrefix, setNamePrefix] = useState('');
  const [nameSuffix, setNameSuffix] = useState('');

  useEffect(() => {
    if (open) {
      setColumnKey(defaultKey);
      setColor(nextGroupColor(groups));
      const existing = groups.find((group) => group.columnKey === defaultKey);
      setNamePrefix(existing?.namePrefix || '');
      setNameSuffix(existing?.nameSuffix || '');
    }
  }, [open, defaultKey, groups]);

  const handleColumnChange = useCallback((event) => {
    const nextKey = event.target.value;
    setColumnKey(nextKey);
    const existing = groups.find((group) => group.columnKey === nextKey);
    setNamePrefix(existing?.namePrefix || '');
    setNameSuffix(existing?.nameSuffix || '');
  }, [groups]);

  const handlePrefixChange = useCallback((_, data) => {
    setNamePrefix(data.value);
  }, []);

  const handleSuffixChange = useCallback((_, data) => {
    setNameSuffix(data.value);
  }, []);

  const count = columnKey && uniqueValueCount ? uniqueValueCount(columnKey) : 0;

  const handleSubmit = useCallback(async () => {
    if (!columnKey) return;
    await onSubmit({ columnKey, color, namePrefix, nameSuffix });
    onOpenChange(false);
  }, [columnKey, color, namePrefix, nameSuffix, onSubmit, onOpenChange]);

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
              <Field
                className={styles.prefixField}
                label="Name suffix"
                hint="Shown after the column value on each tab."
              >
                <Input
                  value={nameSuffix}
                  onChange={handleSuffixChange}
                  placeholder="e.g. NL"
                  maxLength={40}
                />
              </Field>
              {count > TAB_COUNT_WARNING ? (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    This column will create {count} tabs. More than {TAB_COUNT_WARNING} tabs can make the tab bar hard to use.
                  </MessageBarBody>
                </MessageBar>
              ) : null}
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
