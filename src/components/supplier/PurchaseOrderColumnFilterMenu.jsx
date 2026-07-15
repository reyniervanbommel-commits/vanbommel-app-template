import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popover, PopoverTrigger } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';
import { useColumnFormatRulesMenuDraft } from '../../hooks/useColumnFormatRulesMenuDraft';
import { useColumnFormatRulesMenuActions } from '../../hooks/useColumnFormatRulesMenuActions';
import { useColumnTextStyleActions } from '../../hooks/useColumnTextStyleActions';
import { usePurchaseOrderColumnMutationActions } from '../../hooks/usePurchaseOrderColumnMutationActions';
import { usePurchaseOrderSortFilterActions } from '../../hooks/usePurchaseOrderSortFilterActions';
import { usePurchaseOrderColumnMenuFlags } from '../../hooks/usePurchaseOrderColumnMenuFlags';
import { usePurchaseOrderColumnMenuQuickActions } from '../../hooks/usePurchaseOrderColumnMenuQuickActions';
import { useAppToast } from '../../hooks/useAppToast';
import PurchaseOrderColumnMutationDialogs from './PurchaseOrderColumnMutationDialogs';
import PurchaseOrderColumnFilterMenuPopoverContent from './PurchaseOrderColumnFilterMenuPopoverContent';
import {
  getDraftFromFilter,
  isColumnFilterActive,
  isDateColumn,
} from './purchaseOrderColumnFilterMenuConstants';

function PurchaseOrderColumnFilterMenu({
  column,
  filter,
  sortState,
  groupingColumnKey,
  groupingColor,
  isAdmin,
  isStaff = true,
  onToggleWriteback,
  onSetSortDirection,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
  onSetGroupingColumn,
  onClearGrouping,
  onSetGroupingColor,
  isGroupSummaryColumn = false,
  onSetGroupSummaryColumn,
  onAddColumnRightOf,
  datePeriodDisplayMode,
  onSetDatePeriodDisplayMode,
  onRenameColumn,
  onRemoveColumn,
  isLineColumnSummed = false,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  columnTextStyle,
  onSetColumnTextStyle,
  columnFormatRuleSet = null,
  onSetColumnFormatRules,
  referenceColumns = [],
  isConnectedType = false,
  connectionTargets = [],
  canMakeColumnSticky = false,
  isStickyColumn = false,
  isStickyActionEnabled = false,
  stickyColumnCount = 0,
  onMakeColumnSticky,
}) {
  const styles = usePurchaseOrderColumnFilterMenuStyles();
  const [open, setOpen] = useState(false);
  // Tracks which flyout submenu is currently aligned with the hovered menu item.
  const [activeSubmenu, setActiveSubmenu] = useState('none');
  const [submenuTop, setSubmenuTop] = useState(0);
  const [draft, setDraft] = useState(() => getDraftFromFilter(column, filter));
  const isDate = isDateColumn(column);
  const groupingColumnKeys = useMemo(
    () => String(groupingColumnKey || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    [groupingColumnKey]
  );
  const isGroupingColumn = groupingColumnKeys.includes(column.key);
  const operatorLabels = isDate ? DATE_FILTER_OPERATORS : TEXT_FILTER_OPERATORS;
  const operatorEntries = useMemo(() => Object.entries(operatorLabels), [operatorLabels]);
  const sortDirection = sortState.columnKey === column.key ? sortState.direction : 'none';
  const filterActive = isColumnFilterActive(column, filter);
  const writable = !!column.writableToD365;
  const { notifyError } = useAppToast();
  const formatRulesDraft = useColumnFormatRulesMenuDraft({ open, columnFormatRuleSet });
  const { canToggleWriteback, showWritebackLocked, canRenameColumn, canRemoveColumn, canToggleLineTotal, canToggleGroupSummary, canPushLineTotalToHeader, canPushLineValuesToHeader, canSetColumnTextStyle, canSetColumnFormatRules, canPromoteToSticky, canUnstickSticky, canToggleStickyAction, canAddColumn, canEditFormulaColumn, canConfigureDatePeriodDisplay, readOnlyColumnMenu, columnTypeMeta } = usePurchaseOrderColumnMenuFlags({ column, isAdmin, isStaff, onToggleWriteback, onRenameColumn, onRemoveColumn, onToggleLineColumnSum, onSetGroupSummaryColumn, onPushLineTotalToHeader, onPushLineValuesToHeader, onSetColumnTextStyle, onSetColumnFormatRules, onAddColumnRightOf, canMakeColumnSticky, isStickyColumn, isStickyActionEnabled, onMakeColumnSticky, isConnectedType });
  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveSubmenu('none');
    setSubmenuTop(0);
  }, []);
  const {
    textStyleDraft,
    handleTextColorChange,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleApplyTextStyle,
    handleClearTextStyle,
  } = useColumnTextStyleActions({
    open,
    columnTextStyle,
    canSetColumnTextStyle,
    onSetColumnTextStyle,
    columnKey: column.key,
    onClose: closeMenu,
  });
  const { dialogState, setRenameValue, handleRenameColumn, handleRenameCancel, handleRenameSubmit, handleRemoveColumn, handleRemoveCancel, handleRemoveConfirm } = usePurchaseOrderColumnMutationActions({
    column,
    canRenameColumn,
    canRemoveColumn,
    onRenameColumn,
    onRemoveColumn,
    onCloseMenu: closeMenu,
  });
  const handleRenameValueChange = useCallback((_, data) => setRenameValue(data.value), [setRenameValue]);
  const formatReferenceColumns = useMemo(() => (Array.isArray(referenceColumns) ? referenceColumns : []).filter((refColumn) => refColumn?.key && refColumn.key !== column.key), [referenceColumns, column.key]);
  const remarksAlreadyAdded = useMemo(
    () => referenceColumns.some((refColumn) => refColumn?.dataType === 'remarks'),
    [referenceColumns]
  );
  useEffect(() => {
    if (open) {
      setDraft(getDraftFromFilter(column, filter));
    }
  }, [open, column, filter]);
  const handleOpenChange = useCallback((_, data) => {
    setOpen(data.open);
    if (!data.open) {
      setActiveSubmenu('none');
      setSubmenuTop(0);
    }
  }, []);
  const openSubmenu = useCallback((name, event) => {
    setActiveSubmenu(name);
    setSubmenuTop(event?.currentTarget?.offsetTop || 0);
  }, []);
  const closeSubmenu = useCallback(() => {
    setActiveSubmenu('none');
    setSubmenuTop(0);
  }, []);
  const handleAddType = useCallback((typeDef) => {
    onAddColumnRightOf(column, typeDef);
    setActiveSubmenu('none');
    setOpen(false);
  }, [column, onAddColumnRightOf]);
  const handleEditFormulaColumn = useCallback(() => {
    if (!canEditFormulaColumn) return;
    onAddColumnRightOf(column, { key: 'formula-edit' });
    setOpen(false);
  }, [canEditFormulaColumn, column, onAddColumnRightOf]);
  const handleSelectDatePeriodDisplayMode = useCallback((displayMode) => {
    if (!canConfigureDatePeriodDisplay || typeof onSetDatePeriodDisplayMode !== 'function') return;
    onSetDatePeriodDisplayMode(column.key, displayMode);
    setActiveSubmenu('none');
  }, [canConfigureDatePeriodDisplay, column.key, onSetDatePeriodDisplayMode]);
  const { setSortAsc, setSortDesc, clearSort, handleOperatorSelect, handleValueChange, handleSecondaryValueChange, handleApply, handleClearFilter } = usePurchaseOrderSortFilterActions({
    columnKey: column.key,
    draft,
    isDate,
    onSetSortDirection,
    onSetOperator,
    onSetValue,
    onSetSecondaryValue,
    onClearFilter,
    setDraft,
    setOpen,
  });
  const { handleApplyFormatRules, handleClearFormatRules } = useColumnFormatRulesMenuActions({
    canSetColumnFormatRules,
    columnKey: column.key,
    formatRulesDraft,
    onSetColumnFormatRules,
    onClose: closeMenu,
    onError: notifyError,
  });
  const { handleToggleWriteback, handleToggleLineTotal, handleToggleGroupSummary, handlePushLineTotalToHeader, handlePushLineValuesToHeader, handleMakeColumnSticky } = usePurchaseOrderColumnMenuQuickActions({ column, writable, isLineColumnSummed, isGroupSummaryColumn, canToggleWriteback, canToggleLineTotal, canToggleGroupSummary, canPushLineTotalToHeader, canPushLineValuesToHeader, canToggleStickyAction, onToggleWriteback, onToggleLineColumnSum, onSetGroupSummaryColumn, onPushLineTotalToHeader, onPushLineValuesToHeader, onMakeColumnSticky, setOpen });
  const triggerClassName = filterActive || sortDirection !== 'none' ? `${styles.trigger} ${styles.triggerActive}` : styles.trigger;

  return (
    <>
    <Popover open={open} onOpenChange={handleOpenChange} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={triggerClassName}
          appearance="subtle"
          size="small"
          aria-label={`Sort, filter and add column for ${column.label}`}
          data-column-menu-trigger="true"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          ...
        </Button>
      </PopoverTrigger>
      <PurchaseOrderColumnFilterMenuPopoverContent
        styles={styles} column={column} columnTypeMeta={columnTypeMeta} connectionTargets={connectionTargets}
        activeSubmenu={activeSubmenu} submenuTop={submenuTop} openSubmenu={openSubmenu} closeSubmenu={closeSubmenu}
        showGrouping={isStaff && !readOnlyColumnMenu}
        showColumnMutations={isStaff}
        showSortAndFilter={!readOnlyColumnMenu}
        canSetColumnTextStyle={canSetColumnTextStyle} canSetColumnFormatRules={canSetColumnFormatRules}
        canToggleWriteback={canToggleWriteback} showWritebackLocked={showWritebackLocked} handleToggleWriteback={handleToggleWriteback} writable={writable}
        canAddColumn={canAddColumn} canRenameColumn={canRenameColumn} handleRenameColumn={handleRenameColumn} canEditFormulaColumn={canEditFormulaColumn}
        canConfigureDatePeriodDisplay={canConfigureDatePeriodDisplay}
        datePeriodDisplayMode={datePeriodDisplayMode}
        onSelectDatePeriodDisplayMode={handleSelectDatePeriodDisplayMode}
        handleEditFormulaColumn={handleEditFormulaColumn}
        canRemoveColumn={canRemoveColumn} handleRemoveColumn={handleRemoveColumn} canToggleLineTotal={canToggleLineTotal} isLineColumnSummed={isLineColumnSummed}
        handleToggleLineTotal={handleToggleLineTotal} canPushLineTotalToHeader={canPushLineTotalToHeader} handlePushLineTotalToHeader={handlePushLineTotalToHeader}
        canPushLineValuesToHeader={canPushLineValuesToHeader} handlePushLineValuesToHeader={handlePushLineValuesToHeader}
        canMakeColumnSticky={canMakeColumnSticky} isStickyColumn={isStickyColumn} canPromoteToSticky={canPromoteToSticky} canUnstickSticky={canUnstickSticky}
        stickyColumnCount={stickyColumnCount} handleMakeColumnSticky={handleMakeColumnSticky} setSortAsc={setSortAsc} setSortDesc={setSortDesc} clearSort={clearSort}
        isDate={isDate} draft={draft} operatorLabels={operatorLabels} operatorEntries={operatorEntries} handleOperatorSelect={handleOperatorSelect} handleValueChange={handleValueChange}
        handleSecondaryValueChange={handleSecondaryValueChange} handleApply={handleApply} handleClearFilter={handleClearFilter} handleAddType={handleAddType}
        remarksAlreadyAdded={remarksAlreadyAdded}
        textStyleDraft={textStyleDraft} handleTextColorChange={handleTextColorChange} handleToggleBold={handleToggleBold} handleToggleItalic={handleToggleItalic}
        handleToggleUnderline={handleToggleUnderline} handleApplyTextStyle={handleApplyTextStyle} handleClearTextStyle={handleClearTextStyle}
        formatRulesDraft={formatRulesDraft} formatReferenceColumns={formatReferenceColumns} handleApplyFormatRules={handleApplyFormatRules}
        handleClearFormatRules={handleClearFormatRules} isGroupingColumn={isGroupingColumn} groupingColor={groupingColor}
        onSetGroupingColumn={onSetGroupingColumn} onClearGrouping={onClearGrouping} onSetGroupingColor={onSetGroupingColor}
        canToggleGroupSummary={canToggleGroupSummary} isGroupSummaryColumn={isGroupSummaryColumn} handleToggleGroupSummary={handleToggleGroupSummary}
      />
    </Popover>
    {dialogState.renameOpen || dialogState.removeOpen ? (
      <PurchaseOrderColumnMutationDialogs
        columnLabel={column.label}
        renameOpen={dialogState.renameOpen}
        renameValue={dialogState.renameValue}
        renameBusy={dialogState.renameBusy}
        onRenameValueChange={handleRenameValueChange}
        onRenameCancel={handleRenameCancel}
        onRenameSubmit={handleRenameSubmit}
        removeOpen={dialogState.removeOpen}
        removeBusy={dialogState.removeBusy}
        onRemoveCancel={handleRemoveCancel}
        onRemoveConfirm={handleRemoveConfirm}
      />
    ) : null}
    </>
  );
}

export default memo(PurchaseOrderColumnFilterMenu);
