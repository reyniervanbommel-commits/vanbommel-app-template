import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import { FilterMenuMainPane, FilterMenuSubPane } from './PurchaseOrderColumnFilterMenuPanels';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';
import { useColumnFormatRulesMenuDraft } from '../../hooks/useColumnFormatRulesMenuDraft';
import { useColumnFormatRulesMenuActions } from '../../hooks/useColumnFormatRulesMenuActions';
import { useColumnTextStyleActions } from '../../hooks/useColumnTextStyleActions';
import { usePurchaseOrderColumnMutationActions } from '../../hooks/usePurchaseOrderColumnMutationActions';
import { usePurchaseOrderSortFilterActions } from '../../hooks/usePurchaseOrderSortFilterActions';
import { useAppToast } from '../../hooks/useAppToast';
import PurchaseOrderColumnMutationDialogs from './PurchaseOrderColumnMutationDialogs';
import {
  getDraftFromFilter,
  getColumnTypeMeta,
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
  const canToggleWriteback = Boolean(isAdmin && typeof onToggleWriteback === 'function' && column.d365Field && column.writeBackAllowed !== false);
  const showWritebackLocked = Boolean(column.source === 'd365' && column.d365Field && column.writeBackAllowed === false);
  const canRenameColumn = Boolean(column.source === 'custom' && typeof onRenameColumn === 'function');
  const canRemoveColumn = Boolean(column.source === 'custom' && typeof onRemoveColumn === 'function');
  const isLineColumn = column.level === 'line';
  const isLineNumberColumn = column.level === 'line' && column.dataType === 'number';
  const canToggleLineTotal = Boolean(isLineNumberColumn && typeof onToggleLineColumnSum === 'function');
  const canPushLineTotalToHeader = Boolean(isLineNumberColumn && typeof onPushLineTotalToHeader === 'function');
  const canPushLineValuesToHeader = Boolean(isLineColumn && typeof onPushLineValuesToHeader === 'function');
  const canSetColumnTextStyle = typeof onSetColumnTextStyle === 'function';
  const canSetColumnFormatRules = typeof onSetColumnFormatRules === 'function';
  const canPromoteToSticky = Boolean(
    canMakeColumnSticky
    && !isStickyColumn
    && isStickyActionEnabled
    && typeof onMakeColumnSticky === 'function'
  );
  const canUnstickSticky = Boolean(
    canMakeColumnSticky
    && isStickyColumn
    && isStickyActionEnabled
    && typeof onMakeColumnSticky === 'function'
  );
  const canToggleStickyAction = canPromoteToSticky || canUnstickSticky;
  const { notifyError } = useAppToast();
  const isImageColumn = column?.dataType === 'image';
  const columnTypeMeta = useMemo(() => getColumnTypeMeta(column, { isConnected: isConnectedType }), [column, isConnectedType]);
  const formatRulesDraft = useColumnFormatRulesMenuDraft({ open, columnFormatRuleSet });
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
  const canAddColumn = typeof onAddColumnRightOf === 'function';
  const canEditFormulaColumn = Boolean(canAddColumn && column.source === 'custom' && String(column.formulaExpr || '').trim());
  const canEditImageColumn = Boolean(canAddColumn && column.source === 'custom' && column.dataType === 'image');
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
  const handleToggleWriteback = useCallback(() => {
    if (!canToggleWriteback) return; onToggleWriteback(column.id, !writable); setOpen(false);
  }, [canToggleWriteback, column.id, onToggleWriteback, writable]);
  const handleToggleLineTotal = useCallback(() => {
    if (!canToggleLineTotal) return;
    onToggleLineColumnSum(column.key, !isLineColumnSummed);
    setOpen(false);
  }, [canToggleLineTotal, column.key, isLineColumnSummed, onToggleLineColumnSum]);
  const { handleApplyFormatRules, handleClearFormatRules } = useColumnFormatRulesMenuActions({
    canSetColumnFormatRules,
    columnKey: column.key,
    formatRulesDraft,
    onSetColumnFormatRules,
    onClose: closeMenu,
    onError: notifyError,
  });
  const handlePushLineTotalToHeader = useCallback(() => {
    if (!canPushLineTotalToHeader) return;
    onPushLineTotalToHeader(column);
    setOpen(false);
  }, [canPushLineTotalToHeader, column, onPushLineTotalToHeader]);
  const handlePushLineValuesToHeader = useCallback(() => {
    if (!canPushLineValuesToHeader) return;
    onPushLineValuesToHeader(column);
    setOpen(false);
  }, [canPushLineValuesToHeader, column, onPushLineValuesToHeader]);
  const handleMakeColumnSticky = useCallback(() => {
    if (!canToggleStickyAction) return;
    onMakeColumnSticky(column.key);
    setOpen(false);
  }, [canToggleStickyAction, column.key, onMakeColumnSticky]);
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
      <PopoverSurface className={styles.surface}>
        <FilterMenuMainPane
          styles={styles}
          columnLabel={column.label}
          columnTypeMeta={columnTypeMeta}
          connectionTargets={connectionTargets}
          showSortAndFilter={!isImageColumn}
          showGrouping={!isImageColumn}
          activeSubmenu={activeSubmenu}
          toggleSubmenu={toggleSubmenu}
          canSetColumnTextStyle={canSetColumnTextStyle}
          canSetColumnFormatRules={canSetColumnFormatRules && !isImageColumn}
          canToggleWriteback={canToggleWriteback}
          showWritebackLocked={showWritebackLocked}
          handleToggleWriteback={handleToggleWriteback}
          writable={writable}
          canAddColumn={canAddColumn}
          canRenameColumn={canRenameColumn}
          handleRenameColumn={handleRenameColumn}
          canEditFormulaColumn={canEditFormulaColumn}
          handleEditFormulaColumn={handleEditFormulaColumn}
          canEditImageColumn={canEditImageColumn}
          handleEditImageColumn={handleEditImageColumn}
          canRemoveColumn={canRemoveColumn}
          handleRemoveColumn={handleRemoveColumn}
          canToggleLineTotal={canToggleLineTotal}
          isLineColumnSummed={isLineColumnSummed}
          handleToggleLineTotal={handleToggleLineTotal}
          canPushLineTotalToHeader={canPushLineTotalToHeader}
          handlePushLineTotalToHeader={handlePushLineTotalToHeader}
          canPushLineValuesToHeader={canPushLineValuesToHeader}
          handlePushLineValuesToHeader={handlePushLineValuesToHeader}
          canMakeColumnSticky={canMakeColumnSticky}
          isStickyColumn={isStickyColumn}
          canPromoteToSticky={canPromoteToSticky}
          canUnstickSticky={canUnstickSticky}
          stickyColumnCount={stickyColumnCount}
          handleMakeColumnSticky={handleMakeColumnSticky}
          setSortAsc={setSortAsc}
          setSortDesc={setSortDesc}
          clearSort={clearSort}
          isDate={isDate}
          draft={draft}
          operatorLabels={operatorLabels}
          operatorEntries={operatorEntries}
          handleOperatorSelect={handleOperatorSelect}
          handleValueChange={handleValueChange}
          handleSecondaryValueChange={handleSecondaryValueChange}
          handleApply={handleApply}
          handleClearFilter={handleClearFilter}
        />
        <FilterMenuSubPane
          styles={styles}
          activeSubmenu={activeSubmenu}
          handleAddType={handleAddType}
          textStyleDraft={textStyleDraft}
          handleTextColorChange={handleTextColorChange}
          handleToggleBold={handleToggleBold}
          handleToggleItalic={handleToggleItalic}
          handleToggleUnderline={handleToggleUnderline}
          columnLabel={column.label}
          handleApplyTextStyle={handleApplyTextStyle}
          handleClearTextStyle={handleClearTextStyle}
          formatTarget={formatRulesDraft.formatTarget}
          setFormatTarget={formatRulesDraft.setFormatTarget}
          formatRules={formatRulesDraft.formatRules}
          formatReferenceColumns={formatReferenceColumns}
          addFormatRule={formatRulesDraft.addFormatRule}
          updateFormatRule={formatRulesDraft.updateFormatRule}
          removeFormatRule={formatRulesDraft.removeFormatRule}
          handleApplyFormatRules={handleApplyFormatRules}
          handleClearFormatRules={handleClearFormatRules}
          column={column}
          isGroupingColumn={isGroupingColumn}
          groupingColor={groupingColor}
          onSetGroupingColumn={onSetGroupingColumn}
          onClearGrouping={onClearGrouping}
          onSetGroupingColor={onSetGroupingColor}
        />
      </PopoverSurface>
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
