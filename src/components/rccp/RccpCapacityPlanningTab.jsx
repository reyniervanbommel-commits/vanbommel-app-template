import React, { useCallback, useEffect } from 'react';
import {
  Button, Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useRccpCapacityPlanning } from '../../hooks/useRccpCapacityPlanning';
import RccpCapacityPlanningTable from './RccpCapacityPlanningTable';
import RccpImportDialog from './RccpImportDialog';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalL) },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  hint: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export default function RccpCapacityPlanningTab({
  vendorAccount = '',
  enabled = true,
  isAdmin = false,
  onImported,
  onChanged,
  onRegisterReload,
}) {
  const styles = useStyles();
  const {
    rows,
    loading,
    error,
    readOnly,
    rowError,
    setRowError,
    reload,
    addEmptyRow,
    updateRow,
    saveRow,
    deleteRow,
  } = useRccpCapacityPlanning({ vendorAccount, enabled });

  useEffect(() => {
    onRegisterReload?.(reload);
    return () => onRegisterReload?.(null);
  }, [onRegisterReload, reload]);

  const handleImported = useCallback((data) => {
    setRowError('');
    reload();
    onImported?.(data);
  }, [onImported, reload, setRowError]);

  const handleSaveRow = useCallback(async (row) => {
    const ok = await saveRow(row);
    if (ok) onChanged?.();
    return ok;
  }, [onChanged, saveRow]);

  const handleDeleteRow = useCallback(async (row) => {
    const ok = await deleteRow(row);
    if (ok) onChanged?.();
    return ok;
  }, [onChanged, deleteRow]);

  return (
    <div className={styles.root}>
      <Text className={styles.hint}>
        Planned vendor capacity imported from Excel. Edit values inline and save each row.
      </Text>

      {isAdmin && (
        <div className={styles.toolbar}>
          <RccpImportDialog readOnly={readOnly} onImported={handleImported} />
          <Button icon={<Add24Regular />} disabled={readOnly} onClick={addEmptyRow}>
            Add row
          </Button>
        </div>
      )}

      {loading && <Spinner label="Loading capacity planning..." />}
      {error && <Text className={styles.error}>{error}</Text>}

      {!loading && !error && (
        <RccpCapacityPlanningTable
          rows={rows}
          readOnly={readOnly}
          rowError={rowError}
          onUpdate={updateRow}
          onSave={handleSaveRow}
          onDelete={handleDeleteRow}
        />
      )}
    </div>
  );
}
