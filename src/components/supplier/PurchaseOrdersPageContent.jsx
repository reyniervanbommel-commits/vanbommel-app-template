import React, { memo, useCallback, useMemo } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import { RemarksPanel } from './remarks';
import { TrackChangesContext } from './trackChangesContext';
import { useTrackChanges } from '../../hooks/useTrackChanges';

const useStyles = makeStyles({
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

function PurchaseOrdersPageContent({ status, tableContext }) {
  const styles = useStyles();
  const { pageModel, boardView, bulkEdit } = tableContext;
  const trackChangesMeta = pageModel.trackChangesMeta || null;

  // Admin-toggle voor track-changes per kolom. Config-call is admin-only; laad alleen voor admins.
  const { setColumnEnabled: setTrackColumnEnabled } = useTrackChanges({ autoLoad: tableContext.isAdmin });
  const onToggleTrackChanges = useCallback(async (columnId, enabled) => {
    await setTrackColumnEnabled(columnId, enabled);
    await pageModel.reload();
  }, [setTrackColumnEnabled, pageModel]);
  const trackChangesActiveByColumnId = useMemo(
    () => trackChangesMeta?.activeOffsetByColumnId || null,
    [trackChangesMeta],
  );
  const data = useMemo(() => ({
    items: pageModel.orders,
    columns: pageModel.visibleHeaderColumns,
    lineColumns: pageModel.lineColumns,
    boardView,
  }), [
    boardView,
    pageModel.lineColumns,
    pageModel.orders,
    pageModel.visibleHeaderColumns,
  ]);
  const layout = useMemo(() => ({
    headerColumnWidths: pageModel.headerColumnWidths,
    lineColumnWidths: pageModel.lineColumnWidths,
    stickyColumns: tableContext.stickyColumns,
  }), [
    pageModel.headerColumnWidths,
    pageModel.lineColumnWidths,
    tableContext.stickyColumns,
  ]);
  const formatting = useMemo(() => ({
    headerColumnWidths: pageModel.headerColumnWidths,
    lineColumnWidths: pageModel.lineColumnWidths,
    headerColumnTextStyles: pageModel.headerColumnTextStyles,
    headerColumnFormatRules: pageModel.headerColumnFormatRules,
    lineColumnTextStyles: pageModel.lineColumnTextStyles,
    lineColumnFormatRules: pageModel.lineColumnFormatRules,
  }), [
    pageModel.headerColumnFormatRules,
    pageModel.headerColumnTextStyles,
    pageModel.headerColumnWidths,
    pageModel.lineColumnFormatRules,
    pageModel.lineColumnTextStyles,
    pageModel.lineColumnWidths,
  ]);
  const cellActions = useMemo(() => ({
    onSaveValue: bulkEdit.handleSaveValue,
    onCorrect: bulkEdit.handleCorrectField,
    onUpdateStatusOptions: pageModel.updateStatusOptions,
    isAdmin: tableContext.isAdmin,
  }), [
    bulkEdit.handleCorrectField,
    bulkEdit.handleSaveValue,
    pageModel.updateStatusOptions,
    tableContext.isAdmin,
  ]);
  const columnActions = useMemo(() => ({
    onRenameColumn: pageModel.renameColumn,
    onRemoveColumn: pageModel.removeColumn,
    isAdmin: tableContext.isAdmin,
    onToggleWriteback: pageModel.toggleWriteback,
    onReorderHeaderColumn: pageModel.reorderHeaderColumn,
    onReorderLineColumn: pageModel.reorderLineColumn,
    onSaveHeaderColumnWidth: pageModel.saveHeaderColumnWidth,
    onSaveLineColumnWidth: pageModel.saveLineColumnWidth,
    onSaveHeaderColumnTextStyle: pageModel.saveHeaderColumnTextStyle,
    onSaveHeaderColumnFormatRules: pageModel.saveHeaderColumnFormatRules,
    onSaveLineColumnTextStyle: pageModel.saveLineColumnTextStyle,
    onSaveLineColumnFormatRules: pageModel.saveLineColumnFormatRules,
    onAddColumnRightOf: tableContext.handleAddColumnRightOf,
    editingColumnKey: tableContext.editingColumnKey,
    onEditingDone: tableContext.handleEditingDone,
    reorderingColumns: pageModel.savingColumns,
    onToggleTrackChanges,
    trackChangesActiveByColumnId,
  }), [
    pageModel,
    tableContext.editingColumnKey,
    tableContext.handleAddColumnRightOf,
    tableContext.handleEditingDone,
    tableContext.isAdmin,
    onToggleTrackChanges,
    trackChangesActiveByColumnId,
  ]);
  const linkActions = useMemo(() => ({
    onSetLineColumnTotal: pageModel.setLineColumnTotal,
    onPushLineTotalToHeader: tableContext.handlePushLineTotalToHeader,
    onPushLineValuesToHeader: tableContext.handlePushLineValuesToHeader,
    lineTotalColumns: pageModel.lineTotalColumns,
    lineTotalHeaderLinks: pageModel.lineTotalHeaderLinks,
    lineValueHeaderLinks: pageModel.lineValueHeaderLinks,
  }), [
    pageModel,
    tableContext.handlePushLineTotalToHeader,
    tableContext.handlePushLineValuesToHeader,
  ]);
  const table = useMemo(() => ({
    data,
    layout,
    formatting,
    cellActions,
    columnActions,
    linkActions,
    selection: tableContext.tableSelection,
    remarks: tableContext.remarks.tableState,
  }), [
    cellActions,
    columnActions,
    data,
    formatting,
    layout,
    linkActions,
    tableContext.remarks.tableState,
    tableContext.tableSelection,
  ]);

  if (status.loading) {
    return (
      <div className={styles.contentInset}>
        <Spinner label="Loading purchase orders from SQL cache..." />
      </div>
    );
  }
  if (status.refreshing && status.orderCount === 0) {
    return (
      <div className={styles.contentInset}>
        <Spinner label="Loading purchase orders from D365..." />
      </div>
    );
  }
  if (status.orderCount === 0) {
    return (
      <div className={styles.contentInset}>
        <EmptyState
          title="No purchase orders found"
          description="Refresh the data or check the D365 synchronization."
        />
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableRegion}>
        <TrackChangesContext.Provider value={trackChangesMeta}>
          <PurchaseOrdersBoardTable {...table} />
        </TrackChangesContext.Provider>
      </div>
      <RemarksPanel {...tableContext.remarks.panelProps} />
    </>
  );
}

export default memo(PurchaseOrdersPageContent);
