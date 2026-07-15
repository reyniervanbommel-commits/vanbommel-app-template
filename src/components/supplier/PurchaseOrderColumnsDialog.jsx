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
  makeStyles,
  shorthands,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
});

export default function PurchaseOrderColumnsDialog({
  open,
  onOpenChange,
  columnOptions,
  visibleColumnKeys,
  onSave,
  saving,
}) {
  const styles = useStyles();
  const [localVisible, setLocalVisible] = useState(visibleColumnKeys);

  useEffect(() => {
    if (open) {
      setLocalVisible(visibleColumnKeys);
    }
  }, [open, visibleColumnKeys]);

  const handleToggle = useCallback((columnKey) => {
    setLocalVisible((prev) => (
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey]
    ));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localVisible);
    onOpenChange(false);
  }, [localVisible, onSave, onOpenChange]);

  const handleReset = useCallback(() => {
    setLocalVisible(columnOptions.map((column) => column.key));
  }, [columnOptions]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Manage columns</DialogTitle>
          <DialogContent>
            <div className={styles.list}>
              {columnOptions.map((column) => (
                <Checkbox
                  key={column.key}
                  checked={localVisible.includes(column.key)}
                  onChange={() => handleToggle(column.key)}
                  label={column.header}
                />
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="subtle" onClick={handleReset}>Reset</Button>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={saving || localVisible.length === 0}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

