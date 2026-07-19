import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Add24Regular, ArrowDownload24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useRccpCapacityPlanning } from '../../hooks/useRccpCapacityPlanning';
import { useRccpCapacityPlanningGrid } from '../../hooks/useRccpCapacityPlanningGrid';
import RccpCapacityBulkActionsBar from './RccpCapacityBulkActionsBar';
import RccpCapacityPlanningTable from './RccpCapacityPlanningTable';
import RccpImportDialog from './RccpImportDialog';
import {
  buildCapacityPlanningExportFileName,
  exportCapacityPlanningToExcel,
} from './rccpCapacityPlanningExport';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalL) },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  statusBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
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
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
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
    deleteRows,
    deleteAllRows,
  } = useRccpCapacityPlanning({ vendorAccount, enabled });

  const {
    displayRows,
    filteredCount,
    totalCount,
    filters,
    setFilter,
    clearFilters,
    clearColumnFilter,
    hasActiveFilters,
    isColumnFilterActive,
    sort,
    setSortAsc,
    setSortDesc,
    clearSort,
    selectedKeys,
    selectedCount,
    allVisibleSelected,
    someVisibleSelected,
    toggleSelectAll,
    toggleRowSelection,
    clearSelection,
  } = useRccpCapacityPlanningGrid(rows);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.has(row.localKey)),
    [selectedKeys, rows],
  );

  useEffect(() => {
    onRegisterReload?.(reload);
    return () => onRegisterReload?.(null);
  }, [onRegisterReload, reload]);

  const handleImported = useCallback((data) => {
    setRowError('');
    clearSelection();
    reload();
    onImported?.(data);
  }, [clearSelection, onImported, reload, setRowError]);

  const handleSaveRow = useCallback(async (row) => {
    const ok = await saveRow(row);
    if (ok) onChanged?.();
    return ok;
  }, [onChanged, saveRow]);

  const handleDeleteAll = useCallback(async () => {
    setDeleteBusy(true);
    const ok = await deleteAllRows();
    setDeleteBusy(false);
    if (ok) {
      clearSelection();
      setDeleteAllOpen(false);
      onChanged?.();
    }
  }, [clearSelection, deleteAllRows, onChanged]);

  const handleDeleteSelected = useCallback(async () => {
    setDeleteBusy(true);
    const ok = await deleteRows(selectedRows);
    setDeleteBusy(false);
    if (ok) {
      clearSelection();
      onChanged?.();
    }
    return ok;
  }, [clearSelection, deleteRows, onChanged, selectedRows]);

  const deleteAllLabel = vendorAccount
    ? `Delete all capacity rows for vendor ${vendorAccount}?`
    : 'Delete all capacity rows?';

  const handleExport = useCallback(() => {
    exportCapacityPlanningToExcel(
      displayRows,
      buildCapacityPlanningExportFileName(),
    );
  }, [displayRows]);

  return (
    <div className={styles.root}>
      <Text className={styles.hint}>
        PO-style grid — use column menus for sort and filter. Select rows with checkboxes; Ctrl+click or Shift+click for multi-select.
      </Text>

      <div className={styles.toolbar}>
        <Button
          appearance="secondary"
          icon={<ArrowDownload24Regular />}
          disabled={!displayRows.length}
          onClick={handleExport}
        >
          Export to Excel
        </Button>
        {isAdmin && (
          <>
            <RccpImportDialog readOnly={readOnly} onImported={handleImported} />
            <Button icon={<Add24Regular />} disabled={readOnly} onClick={addEmptyRow}>
              Add row
            </Button>
            <Button
              appearance="secondary"
              icon={<Delete24Regular />}
              disabled={readOnly || !rows.length}
              onClick={() => setDeleteAllOpen(true)}
            >
              Delete all
            </Button>
            {hasActiveFilters && (
              <Button appearance="subtle" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            {!readOnly && (
              <RccpCapacityBulkActionsBar
                selectedCount={selectedCount}
                onDelete={handleDeleteSelected}
                onClear={clearSelection}
                busy={deleteBusy}
              />
            )}
          </>
        )}
      </div>

      <div className={styles.statusBar}>
        <Text>{filteredCount} of {totalCount} rows shown</Text>
        {sort.key && (
          <Text>
            Sorted by {sort.key} ({sort.direction})
          </Text>
        )}
      </div>

      {loading && <Spinner label="Loading capacity planning..." />}
      {error && <Text className={styles.error}>{error}</Text>}

      {!loading && !error && (
        <RccpCapacityPlanningTable
          rows={displayRows}
          totalCount={totalCount}
          readOnly={readOnly}
          rowError={rowError}
          filters={filters}
          sort={sort}
          isColumnFilterActive={isColumnFilterActive}
          onFilterChange={setFilter}
          onClearColumnFilter={clearColumnFilter}
          onSetSortAsc={setSortAsc}
          onSetSortDesc={setSortDesc}
          onClearSort={clearSort}
          selectedKeys={selectedKeys}
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleRowSelection={toggleRowSelection}
          onUpdate={updateRow}
          onSave={handleSaveRow}
        />
      )}

      <Dialog open={deleteAllOpen} onOpenChange={(_, data) => setDeleteAllOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete all capacity rows</DialogTitle>
            <DialogContent>
              <Text>{deleteAllLabel} This cannot be undone.</Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleteAllOpen(false)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleDeleteAll} disabled={deleteBusy}>
                {deleteBusy ? <Spinner size="tiny" /> : 'Delete all'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
