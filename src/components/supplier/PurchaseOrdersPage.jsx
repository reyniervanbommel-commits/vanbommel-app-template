import React, { useCallback, useState } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrdersPageTopBar from './PurchaseOrdersPageTopBar';
import PurchaseOrderFormulaColumnDialog from './PurchaseOrderFormulaColumnDialog';
import PurchaseOrderImageColumnDialog from './PurchaseOrderImageColumnDialog';
import PurchaseOrderBulkEditDialog from './PurchaseOrderBulkEditDialog';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { usePurchaseOrderSavedViewState } from '../../hooks/usePurchaseOrderSavedViewState';
import { usePurchaseOrdersSelection } from '../../hooks/usePurchaseOrdersSelection';
import { usePurchaseOrderHiddenRows } from '../../hooks/usePurchaseOrderHiddenRows';
import { usePurchaseOrdersHeaderLinkActions } from '../../hooks/usePurchaseOrdersHeaderLinkActions';
import { usePurchaseOrderBulkEdit } from '../../hooks/usePurchaseOrderBulkEdit';
import { usePurchaseOrderFormulaDialogState } from '../../hooks/usePurchaseOrderFormulaDialogState';
import { useAuth } from '../../context/AuthContext';
import { formatSyncedAt } from '../../utils/purchaseOrderFormat';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    paddingTop: '24px',
    paddingBottom: '24px',
  },
  contentInset: {
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  tableRegion: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',
    '& > *': {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
      scrollbarGutter: 'stable',
    },
  },
});

export default function PurchaseOrdersPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const { progress: refreshProgress, startProgress, finishProgress, waitForCompletion } = usePurchaseOrderRefreshProgress();
  const {
    orders,
    visibleHeaderColumns,
    lineColumns,
    syncedAt,
    stale,
    hasCache,
    total,
    loading,
    refreshing,
    error,
    refresh,
    finishRefresh,
    setRefreshError,
    reloadAfterRefresh,
    reload,
    deleteRows,
    saveValue,
    addHeaderColumnAfter,
    updateFormulaColumn,
    renameColumn,
    removeColumn,
    newCount,
    changedCount,
    markViewed,
    markingViewed,
    correctField,
    toggleWriteback,
    reorderHeaderColumn,
    reorderLineColumn,
    headerColumnWidths,
    lineColumnWidths,
    headerColumnTextStyles,
    headerColumnFormatRules,
    lineColumnTextStyles,
    lineTotalColumns,
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    saveHeaderColumnTextStyle,
    saveHeaderColumnFormatRules,
    saveLineColumnTextStyle,
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    savingColumns,
    exportColumnLayout,
    applyColumnLayout,
  } = usePurchaseOrdersPage();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const boardView = usePurchaseOrderBoardView({ items: orders, columns: visibleHeaderColumns, lineColumns, lineTotalHeaderLinks, lineValueHeaderLinks });
  const { selection, tableSelection, handleDeleteSelected } = usePurchaseOrdersSelection({ orders, visibleOrders: boardView.processedItems, deleteRows });
  const hiddenRows = usePurchaseOrderHiddenRows({ onRestored: reload });
  const { savedViews, activeViewId, applyViewState, handleResetView, handleSaveAsNew, handleUpdateActive, handleRenameView, handleSetDefault, handleDeleteView } = usePurchaseOrderSavedViewState({
    orders,
    loading,
    exportColumnLayout,
    applyColumnLayout,
    boardView,
  });
  const [editingColumnKey, setEditingColumnKey] = useState('');
  const handleEditingDone = useCallback(() => setEditingColumnKey(''), []);
  const {
    formulaDialogState,
    closeFormulaDialog,
    handleFormulaTypeSelection,
    formulaReferenceColumns,
    submitFormulaColumn,
    imageDialogState,
    closeImageDialog,
    handleImageTypeSelection,
    submitImageColumn,
  } = usePurchaseOrderFormulaDialogState({
    visibleHeaderColumns,
    addHeaderColumnAfter,
    updateFormulaColumn,
    renameColumn,
    headerColumnFormatRules,
    saveHeaderColumnFormatRules,
    setEditingColumnKey,
  });
  const bulkEdit = usePurchaseOrderBulkEdit({ visibleHeaderColumns, visibleOrders: boardView.processedItems, selection, saveValue, correctField });

  const handleAddColumnRightOf = useCallback(async (sourceColumn, typeDef) => {
    if (handleFormulaTypeSelection(sourceColumn, typeDef)) {
      return;
    }
    if (handleImageTypeSelection(sourceColumn, typeDef)) return;
    const created = await addHeaderColumnAfter(sourceColumn.key, {
      label: typeDef.label,
      dataType: typeDef.dataType,
      options: typeDef.options,
    });
    if (created?.key) setEditingColumnKey(created.key);
  }, [addHeaderColumnAfter, handleFormulaTypeSelection, handleImageTypeSelection]);

  const { handlePushLineTotalToHeader, handlePushLineValuesToHeader } = usePurchaseOrdersHeaderLinkActions({
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    visibleHeaderColumns,
    lineTotalColumns,
    addHeaderColumnAfter,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    setLineColumnTotal,
    setEditingColumnKey,
  });

  const handleRefresh = useCallback(async () => {
    startProgress();
    try {
      const started = await refresh();
      if (!started) return;
      const finalProgress = await waitForCompletion();
      if (String(finalProgress?.status || '').toLowerCase() === 'error') {
        setRefreshError(finalProgress?.error || 'D365 refresh mislukt');
        return;
      }
      await reloadAfterRefresh();
      await hiddenRows.reload();
    } catch (err) {
      setRefreshError(err?.message || 'D365 refresh mislukt');
    } finally {
      await finishProgress();
      finishRefresh();
    }
  }, [finishProgress, finishRefresh, hiddenRows, refresh, reloadAfterRefresh, setRefreshError, startProgress, waitForCompletion]);
  const relativeSynced = formatSyncedAt(syncedAt);
  return (
    <div className={styles.page}>
      <PurchaseOrdersPageTopBar
        savedViewsState={{
          savedViews,
          activeViewId,
          applyViewState,
          handleResetView,
          handleSaveAsNew,
          handleUpdateActive,
          handleRenameView,
          handleSetDefault,
          handleDeleteView,
        }}
        headerState={{
          isStaff,
          hasCache,
          relativeSynced,
          stale,
          total,
        }}
        activityState={{
          newCount: boardView.activityCounts?.newCount ?? newCount,
          changedCount: boardView.activityCounts?.changedCount ?? changedCount,
          removedCount: boardView.activityCounts?.removedCount ?? 0,
          markViewed,
          markingViewed,
          activityFilter: boardView.activityFilter,
          toggleActivityFilter: boardView.toggleActivityFilter,
        }}
        bulkState={{
          selectedCount: selection.selectedCount,
          onDeleteSelected: handleDeleteSelected,
          onClearSelection: selection.clear,
        }}
        hiddenRowsState={{
          hiddenRows: hiddenRows.hiddenRows,
          columns: hiddenRows.columns,
          count: hiddenRows.count,
          loading: hiddenRows.loading,
          restoring: hiddenRows.restoring,
          restoreRows: hiddenRows.restoreRows,
        }}
        refreshState={{
          refreshing,
          refreshProgress,
          onRefresh: handleRefresh,
        }}
        error={error}
      />

      {loading ? (
        <div className={styles.contentInset}>
          <Spinner label="Loading purchase orders from SQL cache..." />
        </div>
      ) : refreshing && orders.length === 0 ? (
        <div className={styles.contentInset}>
          <Spinner label="Loading purchase orders from D365..." />
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.contentInset}>
          <EmptyState
            title="Geen purchase orders gevonden"
            description="Vernieuw de gegevens of controleer de D365-synchronisatie."
          />
        </div>
      ) : (
        <div className={styles.tableRegion}>
          <PurchaseOrdersBoardTable
            columns={visibleHeaderColumns}
            lineColumns={lineColumns}
            items={orders}
            boardView={boardView}
            onSaveValue={bulkEdit.handleSaveValue}
            onRenameColumn={renameColumn}
            onRemoveColumn={removeColumn}
            onCorrect={bulkEdit.handleCorrectField}
            isAdmin={isAdmin}
            onToggleWriteback={toggleWriteback}
            onReorderHeaderColumn={reorderHeaderColumn}
            onReorderLineColumn={reorderLineColumn}
            headerColumnWidths={headerColumnWidths}
            lineColumnWidths={lineColumnWidths}
            headerColumnTextStyles={headerColumnTextStyles}
            headerColumnFormatRules={headerColumnFormatRules}
            lineColumnTextStyles={lineColumnTextStyles}
            onSaveHeaderColumnWidth={saveHeaderColumnWidth}
            onSaveLineColumnWidth={saveLineColumnWidth}
            onSaveHeaderColumnTextStyle={saveHeaderColumnTextStyle}
            onSaveLineColumnTextStyle={saveLineColumnTextStyle}
            onAddColumnRightOf={handleAddColumnRightOf}
            onSetLineColumnTotal={setLineColumnTotal}
            onPushLineTotalToHeader={handlePushLineTotalToHeader}
            onPushLineValuesToHeader={handlePushLineValuesToHeader}
            lineTotalColumns={lineTotalColumns}
            lineTotalHeaderLinks={lineTotalHeaderLinks}
            lineValueHeaderLinks={lineValueHeaderLinks}
            editingColumnKey={editingColumnKey}
            onEditingDone={handleEditingDone}
            reorderingColumns={savingColumns}
            selection={tableSelection}
          />
        </div>
      )}
      <PurchaseOrderFormulaColumnDialog open={formulaDialogState.open} onOpenChange={(open) => !open && closeFormulaDialog()} onSubmit={submitFormulaColumn} sourceColumn={formulaDialogState.sourceColumn} availableColumns={formulaReferenceColumns} initialValue={formulaDialogState.editingColumn} />
      <PurchaseOrderImageColumnDialog open={imageDialogState.open} onOpenChange={(open) => !open && closeImageDialog()} onSubmit={submitImageColumn} sourceColumn={imageDialogState.sourceColumn} availableColumns={visibleHeaderColumns} initialValue={imageDialogState.editingColumn} sampleRowValues={boardView.processedItems?.[0]?.values || {}} />
      <PurchaseOrderBulkEditDialog {...bulkEdit.dialogState} {...bulkEdit.dialogActions} />
    </div>
  );
}
