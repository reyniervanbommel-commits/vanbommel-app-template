import { useMemo } from 'react';

/**
 * Creates stable semantic prop groups for the purchase orders board.
 */
export function usePurchaseOrdersBoardTableProps({
  pageState,
  boardView,
  bulkEdit,
  isAdmin,
  onAddColumnRightOf,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  editingColumnKey,
  onEditingDone,
  tableSelection,
  stickyColumnKeys,
  setStickyColumnKeys,
}) {
  return useMemo(() => ({
    boardData: {
      items: pageState.orders,
      columns: pageState.visibleHeaderColumns,
      lineColumns: pageState.lineColumns,
      boardView,
    },
    columnConfig: {
      headerColumnWidths: pageState.headerColumnWidths,
      lineColumnWidths: pageState.lineColumnWidths,
      headerColumnTextStyles: pageState.headerColumnTextStyles,
      headerColumnFormatRules: pageState.headerColumnFormatRules,
      lineColumnTextStyles: pageState.lineColumnTextStyles,
      lineColumnFormatRules: pageState.lineColumnFormatRules,
      lineTotalColumns: pageState.lineTotalColumns,
      lineTotalHeaderLinks: pageState.lineTotalHeaderLinks,
      lineValueHeaderLinks: pageState.lineValueHeaderLinks,
    },
    cellActions: {
      onSaveValue: bulkEdit.handleSaveValue,
      onCorrect: bulkEdit.handleCorrectField,
      isAdmin,
      onToggleWriteback: pageState.toggleWriteback,
      onReorderHeaderColumn: pageState.reorderHeaderColumn,
      onReorderLineColumn: pageState.reorderLineColumn,
    },
    columnActions: {
      onRenameColumn: pageState.renameColumn,
      onRemoveColumn: pageState.removeColumn,
      onSaveHeaderColumnWidth: pageState.saveHeaderColumnWidth,
      onSaveLineColumnWidth: pageState.saveLineColumnWidth,
      onSaveHeaderColumnTextStyle: pageState.saveHeaderColumnTextStyle,
      onSaveHeaderColumnFormatRules: pageState.saveHeaderColumnFormatRules,
      onSaveLineColumnTextStyle: pageState.saveLineColumnTextStyle,
      onSaveLineColumnFormatRules: pageState.saveLineColumnFormatRules,
      onAddColumnRightOf,
      onSetLineColumnTotal: pageState.setLineColumnTotal,
      onPushLineTotalToHeader,
      onPushLineValuesToHeader,
    },
    interactionState: {
      editingColumnKey,
      onEditingDone,
      reorderingColumns: pageState.savingColumns,
      stickyColumns: { keys: stickyColumnKeys, onChange: setStickyColumnKeys },
    },
    selection: tableSelection,
  }), [
    boardView,
    bulkEdit.handleCorrectField,
    bulkEdit.handleSaveValue,
    editingColumnKey,
    isAdmin,
    onAddColumnRightOf,
    onEditingDone,
    onPushLineTotalToHeader,
    onPushLineValuesToHeader,
    pageState,
    setStickyColumnKeys,
    stickyColumnKeys,
    tableSelection,
  ]);
}
