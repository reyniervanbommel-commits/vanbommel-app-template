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
  onToggleWriteback,
  onSetSortDirection,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
  onSetGroupingColumn,
  onClearGrouping,
  onSetGroupingColor,
  onAddColumnRightOf,
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
  // Zijpaneel-submenu: 'none' | 'group' (categorie/groeperen) | 'add' (kolom rechts toevoegen).
  const [activeSubmenu, setActiveSubmenu] = useState('none');
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
  const { canToggleWriteback, showWritebackLocked, canRenameColumn, canRemoveColumn, canToggleLineTotal, canPushLineTotalToHeader, canPushLineValuesToHeader, canSetColumnTextStyle, canSetColumnFormatRules, canPromoteToSticky, canUnstickSticky, canToggleStickyAction, canAddColumn, canEditFormulaColumn, canEditImageColumn, isImageColumn, columnTypeMeta } = usePurchaseOrderColumnMenuFlags({ column, isAdmin, onToggleWriteback, onRenameColumn, onRemoveColumn, onToggleLineColumnSum, onPushLineTotalToHeader, onPushLineValuesToHeader, onSetColumnTextStyle, onSetColumnFormatRules, onAddColumnRightOf, canMakeColumnSticky, isStickyColumn, isStickyActionEnabled, onMakeColumnSticky, isConnectedType });
  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveSubmenu('none');
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
  useEffect(() => {
    if (open) {
      setDraft(getDraftFromFilter(column, filter));
    }
  }, [open, column, filter]);
  const handleOpenChange = useCallback((_, data) => {
    setOpen(data.open);
    if (!data.open) setActiveSubmenu('none');
  }, []);
  const toggleSubmenu = useCallback((name) => {
    setActiveSubmenu((prev) => (prev === name ? 'none' : name));
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
  const handleEditImageColumn = useCallback(() => {
    if (!canEditImageColumn) return;
    onAddColumnRightOf(column, { key: 'image-edit' });
    setOpen(false);
  }, [canEditImageColumn, column, onAddColumnRightOf]);
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
  const { handleToggleWriteback, handleToggleLineTotal, handlePushLineTotalToHeader, handlePushLineValuesToHeader, handleMakeColumnSticky } = usePurchaseOrderColumnMenuQuickActions({ column, writable, isLineColumnSummed, canToggleWriteback, canToggleLineTotal, canPushLineTotalToHeader, canPushLineValuesToHeader, canToggleStickyAction, onToggleWriteback, onToggleLineColumnSum, onPushLineTotalToHeader, onPushLineValuesToHeader, onMakeColumnSticky, setOpen });
  const triggerClassName = filterActive || sortDirection !== 'none' ? `${styles.trigger} ${styles.triggerActive}` : styles.trigger;

  return (
    <>
    <Popover open={open} onOpenChange={handleOpenChange} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={triggerClassName}
          appearance="subtle"
          size="small"
          aria-label={`Sorteren, filteren en kolom toevoegen voor ${column.label}`}
          data-column-menu-trigger="true"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          ...
        </Button>
      </PopoverTrigger>
      <PurchaseOrderColumnFilterMenuPopoverContent
        styles={styles} column={column} columnTypeMeta={columnTypeMeta} connectionTargets={connectionTargets} isImageColumn={isImageColumn}
        activeSubmenu={activeSubmenu} toggleSubmenu={toggleSubmenu} canSetColumnTextStyle={canSetColumnTextStyle} canSetColumnFormatRules={canSetColumnFormatRules}
        canToggleWriteback={canToggleWriteback} showWritebackLocked={showWritebackLocked} handleToggleWriteback={handleToggleWriteback} writable={writable}
        canAddColumn={canAddColumn} canRenameColumn={canRenameColumn} handleRenameColumn={handleRenameColumn} canEditFormulaColumn={canEditFormulaColumn}
        handleEditFormulaColumn={handleEditFormulaColumn} canEditImageColumn={canEditImageColumn} handleEditImageColumn={handleEditImageColumn}
        canRemoveColumn={canRemoveColumn} handleRemoveColumn={handleRemoveColumn} canToggleLineTotal={canToggleLineTotal} isLineColumnSummed={isLineColumnSummed}
        handleToggleLineTotal={handleToggleLineTotal} canPushLineTotalToHeader={canPushLineTotalToHeader} handlePushLineTotalToHeader={handlePushLineTotalToHeader}
        canPushLineValuesToHeader={canPushLineValuesToHeader} handlePushLineValuesToHeader={handlePushLineValuesToHeader}
        canMakeColumnSticky={canMakeColumnSticky} isStickyColumn={isStickyColumn} canPromoteToSticky={canPromoteToSticky} canUnstickSticky={canUnstickSticky}
        stickyColumnCount={stickyColumnCount} handleMakeColumnSticky={handleMakeColumnSticky} setSortAsc={setSortAsc} setSortDesc={setSortDesc} clearSort={clearSort}
        isDate={isDate} draft={draft} operatorLabels={operatorLabels} operatorEntries={operatorEntries} handleOperatorSelect={handleOperatorSelect} handleValueChange={handleValueChange}
        handleSecondaryValueChange={handleSecondaryValueChange} handleApply={handleApply} handleClearFilter={handleClearFilter} handleAddType={handleAddType}
        textStyleDraft={textStyleDraft} handleTextColorChange={handleTextColorChange} handleToggleBold={handleToggleBold} handleToggleItalic={handleToggleItalic}
        handleToggleUnderline={handleToggleUnderline} handleApplyTextStyle={handleApplyTextStyle} handleClearTextStyle={handleClearTextStyle}
        formatRulesDraft={formatRulesDraft} formatReferenceColumns={formatReferenceColumns} handleApplyFormatRules={handleApplyFormatRules}
        handleClearFormatRules={handleClearFormatRules} isGroupingColumn={isGroupingColumn} groupingColor={groupingColor}
        onSetGroupingColumn={onSetGroupingColumn} onClearGrouping={onClearGrouping} onSetGroupingColor={onSetGroupingColor}
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
