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

  useEffect(() => {
    if (open) {
      setColumnKey(defaultKey);
      setColor(nextGroupColor(groups));
    }
  }, [open, defaultKey, groups]);

  const count = columnKey && uniqueValueCount ? uniqueValueCount(columnKey) : 0;

  const handleSubmit = useCallback(async () => {
    if (!columnKey) return;
    await onSubmit({ columnKey, color });
    onOpenChange(false);
  }, [columnKey, color, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create tabs from a column</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Column" hint="One tab per unique value in the current view.">
                <Select value={columnKey} onChange={(event) => setColumnKey(event.target.value)}>
                  {columns.map((column) => (
                    <option key={column.key} value={column.key}>{column.label || column.key}</option>
                  ))}
                </Select>
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
