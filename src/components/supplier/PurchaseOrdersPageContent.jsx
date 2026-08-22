import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles, Spinner } from '@fluentui/react-components';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrdersActiveRulesFlyout from './PurchaseOrdersActiveRulesFlyout';
import { usePurchaseOrdersActiveRules } from './usePurchaseOrdersActiveRules';
import { RemarksPanel } from './remarks';
import BoardSplitView from '../bi/BoardSplitView';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { TrackChangesContext } from './trackChangesContext';
import { LineDetailsContext } from './lineDetailsContext';
import { savePoFilterByColumnForRccp } from '../../utils/poVendorFilterHandoff';

// Vendors mogen nooit terugschrijven naar D365. Forceer write-back uit op alle kolommen zodat
// zowel de inline write-back editor als de D365-sync-indicator verdwijnen voor niet-staff.
function disableWriteBack(columns) {
  if (!Array.isArray(columns)) return columns;
  return columns.map((c) => (c && c.writableToD365 ? { ...c, writableToD365: false } : c));
}

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
  const { user } = useAuth();
  const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.EMPLOYEE;
  const { pageModel, boardView, bulkEdit } = tableContext;
  const trackChangesMeta = pageModel.trackChangesMeta || null;
  const [activeRulesOpen, setActiveRulesOpen] = useState(false);

  // Geeft het actieve vendor-filter door aan de RCCP-pagina, zodat die bij openen
  // dezelfde vendor toont in plaats van standaard de eerste vendor uit de lijst.
  useEffect(() => {
    savePoFilterByColumnForRccp(boardView.filterByColumn);
  }, [boardView.filterByColumn]);

  // Track-changes worden centraal in Settings beheerd; hier alleen de header-indicator.
  const trackChangesActiveByColumnId = useMemo(
    () => trackChangesMeta?.activeOffsetByColumnId || null,
    [trackChangesMeta],
  );
  const data = useMemo(() => ({
    items: pageModel.orders,
    columns: isStaff ? pageModel.visibleHeaderColumns : disableWriteBack(pageModel.visibleHeaderColumns),
    lineColumns: isStaff ? pageModel.lineColumns : disableWriteBack(pageModel.lineColumns),
    boardView,
  }), [
    boardView,
    isStaff,
    pageModel.lineColumns,
    pageModel.orders,
    pageModel.visibleHeaderColumns,
  ]);
  const layout = useMemo(() => ({
    headerColumnWidths: pageModel.headerColumnWidths,
    lineColumnWidths: pageModel.lineColumnWidths,
    stickyColumns: tableContext.stickyColumns,
    collapsedHeaderColumnKeys: pageModel.collapsedHeaderColumnKeys,
    collapsedLineColumnKeys: pageModel.collapsedLineColumnKeys,
  }), [
    pageModel.collapsedHeaderColumnKeys,
    pageModel.collapsedLineColumnKeys,
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
  const activeRules = usePurchaseOrdersActiveRules({
    headerColumns: data.columns,
    lineColumns: data.lineColumns,
    filterByColumn: boardView.filterByColumn,
    headerColumnFormatRules: formatting.headerColumnFormatRules,
    lineColumnFormatRules: formatting.lineColumnFormatRules,
    datePeriodDisplayModes: tableContext.datePeriodDisplayModes,
  });
  const onOpenFlyout = useCallback(() => setActiveRulesOpen(true), []);
  const onCloseActiveRulesFlyout = useCallback(() => setActiveRulesOpen(false), []);
  const onClearFilter = useCallback((item) => {
    boardView.clearColumnFilter(item.columnKey);
  }, [boardView]);
  const onClearFormatRules = useCallback((item) => {
    if (item.scope === 'line') {
      pageModel.saveLineColumnFormatRules(item.columnKey, null);
      return;
    }
    pageModel.saveHeaderColumnFormatRules(item.columnKey, null);
  }, [pageModel]);
  const activeRulesControls = useMemo(() => (isStaff ? {
    hasActive: activeRules.hasActive,
    onOpenFlyout,
  } : undefined), [activeRules.hasActive, isStaff, onOpenFlyout]);
  const activeRulesFilterEditorProps = useMemo(() => ({
    applyColumnFilter: boardView.applyColumnFilter,
    setColumnColorFilter: boardView.setColumnColorFilter,
    items: pageModel.orders,
    headerColumns: data.columns,
    filterByColumn: boardView.filterByColumn,
    datePeriodDisplayModes: tableContext.datePeriodDisplayModes,
    headerColumnFormatRules: formatting.headerColumnFormatRules,
    lineColumnFormatRules: formatting.lineColumnFormatRules,
  }), [
    boardView.applyColumnFilter,
    boardView.filterByColumn,
    boardView.setColumnColorFilter,
    data.columns,
    formatting.headerColumnFormatRules,
    formatting.lineColumnFormatRules,
    pageModel.orders,
    tableContext.datePeriodDisplayModes,
  ]);
  const activeRulesFormatEditorProps = useMemo(() => (isStaff ? {
    headerColumns: data.columns,
    lineColumns: data.lineColumns,
    onSaveHeaderColumnFormatRules: pageModel.saveHeaderColumnFormatRules,
    onSaveLineColumnFormatRules: pageModel.saveLineColumnFormatRules,
  } : undefined), [
    data.columns,
    data.lineColumns, isStaff,
    pageModel.saveHeaderColumnFormatRules,
    pageModel.saveLineColumnFormatRules,
  ]);
  const cellActions = useMemo(() => ({
    onSaveValue: bulkEdit.handleSaveValue,
    // Write-back naar D365 is nooit toegestaan voor vendors (defense in depth naast de kolom-flag).
    onCorrect: isStaff ? bulkEdit.handleCorrectField : undefined,
    onUpdateStatusOptions: pageModel.updateStatusOptions,
    isAdmin: tableContext.isAdmin,
    isStaff: tableContext.isStaff,
    showHistoryIndicators: tableContext.showHistoryIndicators !== false,
  }), [
    bulkEdit.handleCorrectField,
    bulkEdit.handleSaveValue,
    isStaff,
    pageModel.updateStatusOptions,
    tableContext.isAdmin,
    tableContext.isStaff,
    tableContext.showHistoryIndicators,
  ]);
  const columnActions = useMemo(() => ({
    onRenameColumn: pageModel.renameColumn,
    onRemoveColumn: pageModel.removeColumn,
    isAdmin: tableContext.isAdmin,
    isStaff: tableContext.isStaff,
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
    datePeriodDisplayModes: tableContext.datePeriodDisplayModes,
    onSetDatePeriodDisplayMode: tableContext.setDatePeriodDisplayMode,
    editingColumnKey: tableContext.editingColumnKey,
    onEditingDone: tableContext.handleEditingDone,
    reorderingColumns: pageModel.savingColumns,
    trackChangesActiveByColumnId,
    onToggleHeaderColumnCollapsed: pageModel.toggleHeaderColumnCollapsed,
    onToggleLineColumnCollapsed: pageModel.toggleLineColumnCollapsed,
    productImageColumnVisible: pageModel.productImageColumnVisible,
    onToggleProductImageColumn: pageModel.setProductImageColumnVisible,
  }), [
    pageModel,
    tableContext.editingColumnKey,
    tableContext.handleAddColumnRightOf,
    tableContext.datePeriodDisplayModes,
    tableContext.setDatePeriodDisplayMode,
    tableContext.handleEditingDone,
    tableContext.isAdmin,
    tableContext.isStaff,
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
    activeRulesControls,
  }), [
    activeRulesControls,
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
      <BoardSplitView
        filterByColumn={boardView.filterByColumn}
        tableRows={pageModel.orders}
        isStaff={isStaff}
      >
        <div className={styles.tableRegion}>
          <TrackChangesContext.Provider value={trackChangesMeta}>
            <LineDetailsContext.Provider value={pageModel.lineDetails}>
              <PurchaseOrdersBoardTable {...table} />
            </LineDetailsContext.Provider>
          </TrackChangesContext.Provider>
        </div>
      </BoardSplitView>
      <PurchaseOrdersActiveRulesFlyout
        open={activeRulesOpen}
        onClose={onCloseActiveRulesFlyout}
        filters={activeRules.filters}
        formatRules={activeRules.formatRules}
        onClearFilter={onClearFilter}
        onClearFormatRules={onClearFormatRules}
        filterEditorProps={activeRulesFilterEditorProps}
        formatEditorProps={activeRulesFormatEditorProps}
      />
      <RemarksPanel {...tableContext.remarks.panelProps} />
    </>
  );
}

export default memo(PurchaseOrdersPageContent);
