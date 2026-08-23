import { useCallback, useMemo, useState } from 'react';
import { usePurchaseOrdersActiveRules } from './usePurchaseOrdersActiveRules';

const EMPTY_COLUMNS = [];

/**
 * Owns flyout open-state and overview-icon props for the PO-board active rules drawer.
 *
 * @param {{
 *   isStaff: boolean,
 *   headerColumns: object[],
 *   lineColumns: object[],
 *   orders: object[],
 *   boardView: object,
 *   pageModel: object,
 *   datePeriodDisplayModes: object,
 *   headerColumnFormatRules: object,
 *   lineColumnFormatRules: object,
 * }} options
 * @returns {{ activeRulesControls?: { hasActive: boolean, onOpenFlyout: Function }, flyoutProps: object|null }}
 */
export function usePurchaseOrdersActiveRulesFlyout({
  isStaff,
  headerColumns = EMPTY_COLUMNS,
  lineColumns = EMPTY_COLUMNS,
  orders,
  boardView,
  pageModel,
  datePeriodDisplayModes,
  headerColumnFormatRules,
  lineColumnFormatRules,
}) {
  const [open, setOpen] = useState(false);
  const { hasActive, filters, formatRules } = usePurchaseOrdersActiveRules({
    headerColumns: isStaff ? headerColumns : EMPTY_COLUMNS,
    lineColumns: isStaff ? lineColumns : EMPTY_COLUMNS,
    filterByColumn: boardView.filterByColumn,
    headerColumnFormatRules,
    lineColumnFormatRules,
    datePeriodDisplayModes,
    open: isStaff && open,
  });
  const onOpenFlyout = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
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
  const filterEditorProps = useMemo(() => ({
    applyColumnFilter: boardView.applyColumnFilter,
    setColumnColorFilter: boardView.setColumnColorFilter,
    items: orders,
    headerColumns,
    filterByColumn: boardView.filterByColumn,
    datePeriodDisplayModes,
    headerColumnFormatRules,
    lineColumnFormatRules,
  }), [
    boardView.applyColumnFilter,
    boardView.filterByColumn,
    boardView.setColumnColorFilter,
    datePeriodDisplayModes,
    headerColumnFormatRules,
    headerColumns,
    lineColumnFormatRules,
    orders,
  ]);
  const formatEditorProps = useMemo(() => ({
    headerColumns,
    lineColumns,
    onSaveHeaderColumnFormatRules: pageModel.saveHeaderColumnFormatRules,
    onSaveLineColumnFormatRules: pageModel.saveLineColumnFormatRules,
  }), [
    headerColumns,
    lineColumns,
    pageModel.saveHeaderColumnFormatRules,
    pageModel.saveLineColumnFormatRules,
  ]);
  const activeRulesControls = useMemo(() => (isStaff ? {
    hasActive,
    onOpenFlyout,
  } : undefined), [hasActive, isStaff, onOpenFlyout]);
  const flyoutProps = useMemo(() => (isStaff ? {
    open,
    onClose,
    filters,
    formatRules,
    onClearFilter,
    onClearFormatRules,
    filterEditorProps,
    formatEditorProps,
  } : null), [
    filterEditorProps,
    filters,
    formatEditorProps,
    formatRules,
    isStaff,
    onClearFilter,
    onClearFormatRules,
    onClose,
    open,
  ]);

  return { activeRulesControls, flyoutProps };
}
