import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import { FilterMenuMainPane, FilterMenuSubPane } from './PurchaseOrderColumnFilterMenuPanels';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';
import { useColumnFormatRulesMenuDraft } from '../../hooks/useColumnFormatRulesMenuDraft';
import { useColumnFormatRulesMenuActions } from '../../hooks/useColumnFormatRulesMenuActions';
import {
  HEX_COLOR_PATTERN,
  getDraftFromFilter,
  getColumnTypeMeta,
  getTextStyleDraft,
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
}) {
  const styles = usePurchaseOrderColumnFilterMenuStyles();
  const [open, setOpen] = useState(false);
  // Zijpaneel-submenu: 'none' | 'group' (categorie/groeperen) | 'add' (kolom rechts toevoegen).
  const [activeSubmenu, setActiveSubmenu] = useState('none');
  const [draft, setDraft] = useState(() => getDraftFromFilter(column, filter));
  const [textStyleDraft, setTextStyleDraft] = useState(() => getTextStyleDraft(columnTextStyle));
  const isDate = isDateColumn(column);
  const isGroupingColumn = groupingColumnKey === column.key;
  const operatorLabels = isDate ? DATE_FILTER_OPERATORS : TEXT_FILTER_OPERATORS;
  const operatorEntries = useMemo(() => Object.entries(operatorLabels), [operatorLabels]);
  const sortDirection = sortState.columnKey === column.key ? sortState.direction : 'none';
  const filterActive = isColumnFilterActive(column, filter);
  const writable = !!column.writableToD365;
  const canToggleWriteback = Boolean(isAdmin && typeof onToggleWriteback === 'function' && column.d365Field && column.writeBackAllowed !== false);
  const canRenameColumn = Boolean(column.source === 'custom' && typeof onRenameColumn === 'function');
  const canRemoveColumn = Boolean(column.source === 'custom' && typeof onRemoveColumn === 'function');
  const isLineColumn = column.level === 'line';
  const isLineNumberColumn = column.level === 'line' && column.dataType === 'number';
  const canToggleLineTotal = Boolean(isLineNumberColumn && typeof onToggleLineColumnSum === 'function');
  const canPushLineTotalToHeader = Boolean(isLineNumberColumn && typeof onPushLineTotalToHeader === 'function');
  const canPushLineValuesToHeader = Boolean(isLineColumn && typeof onPushLineValuesToHeader === 'function');
  const canSetColumnTextStyle = typeof onSetColumnTextStyle === 'function';
  const canSetColumnFormatRules = typeof onSetColumnFormatRules === 'function';
  const isImageColumn = column?.dataType === 'image';
  const columnTypeMeta = useMemo(() => getColumnTypeMeta(column), [column]);
  const formatRulesDraft = useColumnFormatRulesMenuDraft({ open, columnFormatRuleSet });
  const formatReferenceColumns = useMemo(
    () => (Array.isArray(referenceColumns) ? referenceColumns : [])
      .filter((refColumn) => refColumn?.key && refColumn.key !== column.key),
    [referenceColumns, column.key]
  );
  useEffect(() => {
    if (open) {
      setDraft(getDraftFromFilter(column, filter));
      setTextStyleDraft(getTextStyleDraft(columnTextStyle));
    }
  }, [open, column, filter, columnTextStyle]);
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

  const handleRenameColumn = useCallback(async () => {
    if (!canRenameColumn) return;
    const nextLabel = window.prompt('Rename column', column.label);
    if (nextLabel === null) return;
    const trimmed = nextLabel.trim();
    if (!trimmed || trimmed === column.label) return;
    try {
      await onRenameColumn(column.id, trimmed);
      setOpen(false);
    } catch (err) {
      window.alert(err?.message || 'Renaming the column failed.');
    }
  }, [canRenameColumn, column.id, column.label, onRenameColumn]);

  const handleRemoveColumn = useCallback(async () => {
    if (!canRemoveColumn) return;
    const shouldDelete = window.confirm(
      `Delete column "${column.label}"? This permanently removes the column and all related values from SQL.`
    );
    if (!shouldDelete) return;
    try {
      await onRemoveColumn(column.id);
      setOpen(false);
    } catch (err) {
      window.alert(err?.message || 'Deleting the column failed.');
    }
  }, [canRemoveColumn, column.id, column.label, onRemoveColumn]);

  const setSortAsc = useCallback(() => {
    onSetSortDirection(column.key, 'asc');
    setOpen(false);
  }, [column.key, onSetSortDirection]);

  const setSortDesc = useCallback(() => {
    onSetSortDirection(column.key, 'desc');
    setOpen(false);
  }, [column.key, onSetSortDirection]);

  const clearSort = useCallback(() => {
    onSetSortDirection('', 'none');
    setOpen(false);
  }, [onSetSortDirection]);

  const handleOperatorSelect = useCallback((_, data) => {
    if (!data.optionValue) return;
    setDraft((prev) => ({ ...prev, operator: data.optionValue }));
  }, []);

  const handleValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, []);

  const handleSecondaryValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, secondaryValue: nextValue }));
  }, []);

  const handleApply = useCallback(() => {
    onSetOperator(column.key, draft.operator);
    onSetValue(column.key, draft.value);
    if (isDate && draft.operator === 'between') {
      onSetSecondaryValue(column.key, draft.secondaryValue);
    } else {
      onSetSecondaryValue(column.key, '');
    }
    setOpen(false);
  }, [column.key, draft, isDate, onSetOperator, onSetSecondaryValue, onSetValue]);

  const handleClearFilter = useCallback(() => {
    onClearFilter(column.key);
    setOpen(false);
  }, [column.key, onClearFilter]);

  const handleToggleWriteback = useCallback(() => {
    if (!canToggleWriteback) return; onToggleWriteback(column.id, !writable); setOpen(false);
  }, [canToggleWriteback, column.id, onToggleWriteback, writable]);
  const handleToggleLineTotal = useCallback(() => {
    if (!canToggleLineTotal) return;
    onToggleLineColumnSum(column.key, !isLineColumnSummed);
    setOpen(false);
  }, [canToggleLineTotal, column.key, isLineColumnSummed, onToggleLineColumnSum]);
  const handleTextColorChange = useCallback((event) => {
    const nextColor = String(event.target.value || '').toLowerCase();
    setTextStyleDraft((prev) => ({ ...prev, textColor: HEX_COLOR_PATTERN.test(nextColor) ? nextColor : '' }));
  }, []);
  const handleToggleBold = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, bold: !prev.bold }));
  }, []);
  const handleToggleItalic = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, italic: !prev.italic }));
  }, []);
  const handleToggleUnderline = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, underline: !prev.underline }));
  }, []);
  const handleApplyTextStyle = useCallback(async () => {
    if (!canSetColumnTextStyle) return;
    await onSetColumnTextStyle(column.key, textStyleDraft);
    setOpen(false);
    setActiveSubmenu('none');
  }, [canSetColumnTextStyle, onSetColumnTextStyle, column.key, textStyleDraft]);
  const handleClearTextStyle = useCallback(async () => {
    if (!canSetColumnTextStyle) return;
    await onSetColumnTextStyle(column.key, { textColor: '', bold: false, italic: false, underline: false });
    setTextStyleDraft({ textColor: '', bold: false, italic: false, underline: false });
    setOpen(false);
    setActiveSubmenu('none');
  }, [canSetColumnTextStyle, onSetColumnTextStyle, column.key]);
  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveSubmenu('none');
  }, []);
  const { handleApplyFormatRules, handleClearFormatRules } = useColumnFormatRulesMenuActions({
    canSetColumnFormatRules,
    columnKey: column.key,
    formatRulesDraft,
    onSetColumnFormatRules,
    onClose: closeMenu,
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
  const triggerClassName = filterActive || sortDirection !== 'none' ? `${styles.trigger} ${styles.triggerActive}` : styles.trigger;

  return (
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
          showSortAndFilter={!isImageColumn}
          showGrouping={!isImageColumn}
          activeSubmenu={activeSubmenu}
          toggleSubmenu={toggleSubmenu}
          canSetColumnTextStyle={canSetColumnTextStyle}
          canSetColumnFormatRules={canSetColumnFormatRules && !isImageColumn}
          canToggleWriteback={canToggleWriteback}
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
  );
}

export default memo(PurchaseOrderColumnFilterMenu);
