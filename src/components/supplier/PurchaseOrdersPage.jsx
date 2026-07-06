import React, { useCallback, useState } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrdersPageTopBar from './PurchaseOrdersPageTopBar';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { usePurchaseOrderSavedViewState } from '../../hooks/usePurchaseOrderSavedViewState';
import { usePurchaseOrdersSelection } from '../../hooks/usePurchaseOrdersSelection';
import { usePurchaseOrderHiddenRows } from '../../hooks/usePurchaseOrderHiddenRows';
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
  const {
    progress: refreshProgress,
    startProgress,
    finishProgress,
  } = usePurchaseOrderRefreshProgress();

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
    lineTotalColumns,
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    savingColumns,
    exportColumnLayout,
    applyColumnLayout,
  } = usePurchaseOrdersPage();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  // Filter/sort/grouping-state op page-niveau, zodat saved views deze samen met de
  // kolomlayout kunnen serialiseren en terugzetten.
  const boardView = usePurchaseOrderBoardView({ items: orders, columns: visibleHeaderColumns });
  const {
    selection,
    tableSelection,
    handleDeleteSelected,
  } = usePurchaseOrdersSelection({ orders, visibleOrders: boardView.processedItems, deleteRows });

  // Verborgen rijen die nog binnen de harde D365-filter vallen (zien + terugzetten).
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

  // Monday-stijl kolom toevoegen vanuit het per-kolom menu: maak de kolom rechts van
  // de bron aan en zet zijn header direct in inline-hernoem-modus.
  const [editingColumnKey, setEditingColumnKey] = useState('');
  const handleEditingDone = useCallback(() => setEditingColumnKey(''), []);
  const handleAddColumnRightOf = useCallback(async (sourceColumn, typeDef) => {
    const created = await addHeaderColumnAfter(sourceColumn.key, {
      label: typeDef.label,
      dataType: typeDef.dataType,
      options: typeDef.options,
    });
    if (created?.key) setEditingColumnKey(created.key);
  }, [addHeaderColumnAfter]);
  const handlePushLineTotalToHeader = useCallback(async (lineColumn) => {
    const lineColumnKey = String(lineColumn?.key || '').trim();
    if (!lineColumnKey) return;
    const activeLink = lineTotalHeaderLinks.find((link) => link.lineColumnKey === lineColumnKey);
    if (activeLink?.headerColumnKey) {
      setEditingColumnKey(activeLink.headerColumnKey);
      return;
    }
    const sameKeyHeader = visibleHeaderColumns.find((column) => column.key === lineColumnKey);
    const fallbackHeader = visibleHeaderColumns[visibleHeaderColumns.length - 1];
    const afterKey = sameKeyHeader?.key || fallbackHeader?.key || '';
    const created = await addHeaderColumnAfter(afterKey, {
      label: `${lineColumn.label} Total`,
      dataType: 'number',
    });
    if (!created?.key) return;
    await addLineTotalHeaderLink({ lineColumnKey, headerColumnKey: created.key });
    if (!lineTotalColumns.includes(lineColumnKey)) {
      await setLineColumnTotal(lineColumnKey, true);
    }
    setEditingColumnKey(created.key);
  }, [
    lineTotalHeaderLinks,
    visibleHeaderColumns,
    addHeaderColumnAfter,
    addLineTotalHeaderLink,
    lineTotalColumns,
    setLineColumnTotal,
  ]);
  const handlePushLineValuesToHeader = useCallback(async (lineColumn) => {
    const lineColumnKey = String(lineColumn?.key || '').trim();
    if (!lineColumnKey) return;
    const activeLink = lineValueHeaderLinks.find((link) => link.lineColumnKey === lineColumnKey);
    if (activeLink?.headerColumnKey) {
      setEditingColumnKey(activeLink.headerColumnKey);
      return;
    }
    const fallbackHeader = visibleHeaderColumns[visibleHeaderColumns.length - 1];
    const created = await addHeaderColumnAfter(fallbackHeader?.key || '', {
      label: `${lineColumn.label} Values`,
      dataType: 'text',
    });
    if (!created?.key) return;
    await addLineValueHeaderLink({ lineColumnKey, headerColumnKey: created.key });
    setEditingColumnKey(created.key);
  }, [lineValueHeaderLinks, visibleHeaderColumns, addHeaderColumnAfter, addLineValueHeaderLink]);

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
            onSaveHeaderColumnWidth={saveHeaderColumnWidth}
            onSaveLineColumnWidth={saveLineColumnWidth}
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

    </div>
  );
}
