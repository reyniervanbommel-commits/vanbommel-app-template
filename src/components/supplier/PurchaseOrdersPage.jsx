import React, { useCallback, useState } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrdersPageTopBar from './PurchaseOrdersPageTopBar';
import PurchaseOrderFormulaColumnDialog from './PurchaseOrderFormulaColumnDialog';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { usePurchaseOrderSavedViewState } from '../../hooks/usePurchaseOrderSavedViewState';
import { usePurchaseOrdersSelection } from '../../hooks/usePurchaseOrdersSelection';
import { usePurchaseOrderHiddenRows } from '../../hooks/usePurchaseOrderHiddenRows';
import { usePurchaseOrdersHeaderLinkActions } from '../../hooks/usePurchaseOrdersHeaderLinkActions';
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
  const { progress: refreshProgress, startProgress, finishProgress } = usePurchaseOrderRefreshProgress();

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
  const {
    selection,
    tableSelection,
    handleDeleteSelected,
  } = usePurchaseOrdersSelection({ orders, visibleOrders: boardView.processedItems, deleteRows });

  const hiddenRows = usePurchaseOrderHiddenRows({ onRestored: reload });
  const {
    savedViews,
    activeViewId,
    applyViewState,
    handleResetView,
    handleSaveAsNew,
    handleUpdateActive,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
  } = usePurchaseOrderSavedViewState({
    orders,
    loading,
    exportColumnLayout,
    applyColumnLayout,
    boardView,
  });

  const [editingColumnKey, setEditingColumnKey] = useState('');
  const [formulaDialogState, setFormulaDialogState] = useState({ open: false, sourceColumn: null, editingColumn: null });
  const handleEditingDone = useCallback(() => setEditingColumnKey(''), []);
  const handleFormulaDialogOpen = useCallback((sourceColumn, editingColumn = null) => {
    setFormulaDialogState({ open: true, sourceColumn, editingColumn });
  }, []);
  const handleFormulaDialogClose = useCallback(() => {
    setFormulaDialogState({ open: false, sourceColumn: null, editingColumn: null });
  }, []);
  const formulaReferenceColumns = visibleHeaderColumns.filter(
    (column) => !String(column?.formulaExpr || '').trim()
  );

  const handleAddColumnRightOf = useCallback(async (sourceColumn, typeDef) => {
    if (typeDef?.key === 'formula') {
      handleFormulaDialogOpen(sourceColumn, null);
      return;
    }
    const created = await addHeaderColumnAfter(sourceColumn.key, {
      label: typeDef.label,
      dataType: typeDef.dataType,
      options: typeDef.options,
    });
    if (created?.key) setEditingColumnKey(created.key);
  }, [addHeaderColumnAfter, handleFormulaDialogOpen]);

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

  const handleSubmitFormulaColumn = useCallback(async ({ label, dataType, formulaExpr, formatRuleSet }) => {
    if (formulaDialogState.editingColumn?.id) {
      await updateFormulaColumn(formulaDialogState.editingColumn.id, { label, dataType, formulaExpr });
      setEditingColumnKey(formulaDialogState.editingColumn.key || '');
      return;
    }
    const anchorKey = String(formulaDialogState.sourceColumn?.key || '').trim();
    if (!anchorKey) return;
    if (formatRuleSet?.target === 'row') {
      const existingRowTarget = Object.entries(headerColumnFormatRules || {}).find(([, ruleSet]) => ruleSet?.target === 'row');
      if (existingRowTarget) {
        throw new Error('Er mag maximaal één kolom rij-opmaak gebruiken.');
      }
    }
    const created = await addHeaderColumnAfter(anchorKey, { label, dataType, formulaExpr });
    if (!created?.key) return;
    if (formatRuleSet) {
      await saveHeaderColumnFormatRules(created.key, formatRuleSet);
    }
    setEditingColumnKey(created.key);
  }, [addHeaderColumnAfter, formulaDialogState, headerColumnFormatRules, saveHeaderColumnFormatRules, updateFormulaColumn]);

  const handleRefresh = useCallback(async () => {
    startProgress();
    try {
      await refresh();
      // Na een D365-refresh kan de set "verborgen maar nog in de filter" veranderd zijn.
      await hiddenRows.reload();
    } finally {
      await finishProgress();
    }
  }, [finishProgress, refresh, startProgress, hiddenRows]);

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
          newCount,
          changedCount,
          markViewed,
          markingViewed,
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
            onSaveValue={saveValue}
            onRenameColumn={renameColumn}
            onRemoveColumn={removeColumn}
            onCorrect={correctField}
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
      <PurchaseOrderFormulaColumnDialog
        open={formulaDialogState.open}
        onOpenChange={(open) => !open && handleFormulaDialogClose()}
        onSubmit={handleSubmitFormulaColumn}
        sourceColumn={formulaDialogState.sourceColumn}
        availableColumns={formulaReferenceColumns}
        initialValue={formulaDialogState.editingColumn}
      />
    </div>
  );
}
