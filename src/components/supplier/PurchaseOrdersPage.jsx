import React, { useCallback, useState } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrdersPageTopBar from './PurchaseOrdersPageTopBar';
import PurchaseOrdersPageDialogs from './PurchaseOrdersPageDialogs';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { usePurchaseOrderSavedViewState } from '../../hooks/usePurchaseOrderSavedViewState';
import { usePurchaseOrdersSelection } from '../../hooks/usePurchaseOrdersSelection';
import { usePurchaseOrderHiddenRows } from '../../hooks/usePurchaseOrderHiddenRows';
import { usePurchaseOrdersHeaderLinkActions } from '../../hooks/usePurchaseOrdersHeaderLinkActions';
import { usePurchaseOrdersBoardTableProps } from '../../hooks/usePurchaseOrdersBoardTableProps';
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
  const purchaseOrdersPage = usePurchaseOrdersPage();
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
    headerColumnFormatRules,
    lineTotalColumns,
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    saveHeaderColumnFormatRules,
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    exportColumnLayout,
    applyColumnLayout,
  } = purchaseOrdersPage;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const boardView = usePurchaseOrderBoardView({ items: orders, columns: visibleHeaderColumns, lineColumns, lineTotalHeaderLinks, lineValueHeaderLinks });
  const { selection, tableSelection, handleDeleteSelected } = usePurchaseOrdersSelection({ orders, visibleOrders: boardView.processedItems, deleteRows });
  const hiddenRows = usePurchaseOrderHiddenRows({ onRestored: reload });
  const { savedViews, activeViewId, hasUnsavedChanges, applyViewState, handleResetView, handleSaveAsNew, handleUpdateActive, handleRenameView, handleSetDefault, handleDeleteView, stickyColumnKeys, setStickyColumnKeys } = usePurchaseOrderSavedViewState({
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
  const boardTableProps = usePurchaseOrdersBoardTableProps({
    pageState: purchaseOrdersPage,
    boardView,
    bulkEdit,
    isAdmin,
    onAddColumnRightOf: handleAddColumnRightOf,
    onPushLineTotalToHeader: handlePushLineTotalToHeader,
    onPushLineValuesToHeader: handlePushLineValuesToHeader,
    editingColumnKey,
    onEditingDone: handleEditingDone,
    tableSelection,
    stickyColumnKeys,
    setStickyColumnKeys,
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
          hasUnsavedChanges,
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
          <PurchaseOrdersBoardTable {...boardTableProps} />
        </div>
      )}
      <PurchaseOrdersPageDialogs
        formula={{ state: formulaDialogState, close: closeFormulaDialog, submit: submitFormulaColumn, availableColumns: formulaReferenceColumns, formatRules: headerColumnFormatRules }}
        image={{ state: imageDialogState, close: closeImageDialog, submit: submitImageColumn, availableColumns: visibleHeaderColumns, sampleRowValues: boardView.processedItems?.[0]?.values || {} }}
        bulkEdit={bulkEdit}
      />
    </div>
  );
}
