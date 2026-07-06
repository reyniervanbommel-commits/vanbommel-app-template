import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import { FilterMenuMainPane, FilterMenuSubPane } from './PurchaseOrderColumnFilterMenuPanels';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';
import {
  HEX_COLOR_PATTERN,
  NEW_COLUMN_TYPES,
  getDraftFromFilter,
  getTextStyleDraft,
  isDateColumn,
} from './purchaseOrderColumnFilterMenuConstants';

export function isColumnFilterActive(column, filter) {
  if (!filter) return false;
  if (isDateColumn(column)) {
    if (filter.operator === 'nextWeek') return true;
    if (filter.operator === 'between') return Boolean(filter.value && filter.secondaryValue);
    return Boolean(filter.value);
  }
  return Boolean(filter.value);
}

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
  const handleAddType = useCallback((typeDef) => {
    onAddColumnRightOf(column, typeDef);
    setActiveSubmenu('none');
    setOpen(false);
  }, [column, onAddColumnRightOf]);

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
          activeSubmenu={activeSubmenu}
          toggleSubmenu={toggleSubmenu}
          canSetColumnTextStyle={canSetColumnTextStyle}
          canToggleWriteback={canToggleWriteback}
          handleToggleWriteback={handleToggleWriteback}
          writable={writable}
          canAddColumn={canAddColumn}
          canRenameColumn={canRenameColumn}
          handleRenameColumn={handleRenameColumn}
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
          newColumnTypes={NEW_COLUMN_TYPES}
          handleAddType={handleAddType}
          textStyleDraft={textStyleDraft}
          handleTextColorChange={handleTextColorChange}
          handleToggleBold={handleToggleBold}
          handleToggleItalic={handleToggleItalic}
          handleToggleUnderline={handleToggleUnderline}
          columnLabel={column.label}
          handleApplyTextStyle={handleApplyTextStyle}
          handleClearTextStyle={handleClearTextStyle}
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
