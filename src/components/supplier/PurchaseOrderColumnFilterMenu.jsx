import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Input, Option, Popover, PopoverSurface, PopoverTrigger, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import PurchaseOrderColumnGroupingSection from './PurchaseOrderColumnGroupingSection';

const useStyles = makeStyles({
  trigger: {
    minWidth: '22px',
    width: '22px',
    height: '22px',
    ...shorthands.padding('0'),
    color: tokens.colorNeutralForeground3,
    opacity: 0,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: '120ms',
  },
  triggerActive: {
    color: tokens.colorBrandForeground1,
  },
  surface: {
    width: '280px',
    maxWidth: '280px',
    ...shorthands.padding('8px'),
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  sortActions: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  sortButton: {
    justifyContent: 'flex-start',
  },
  divider: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  fieldTitle: {
    fontWeight: tokens.fontWeightSemibold,
  },
  filterRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  actionRow: {
    display: 'flex',
    ...shorthands.gap('6px'),
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
});

function isDateColumn(column) {
  return column?.dataType === 'date';
}

function getDefaultOperator(column) {
  return isDateColumn(column) ? 'before' : 'contains';
}

function getDraftFromFilter(column, filter) {
  return {
    operator: filter?.operator || getDefaultOperator(column),
    value: filter?.value || '',
    secondaryValue: filter?.secondaryValue || '',
  };
}

function hasActiveFilter(column, filter) {
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
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [showCategoryBar, setShowCategoryBar] = useState(false);
  const [draft, setDraft] = useState(() => getDraftFromFilter(column, filter));
  const isDate = isDateColumn(column);
  const isGroupingColumn = groupingColumnKey === column.key;
  const operatorLabels = isDate ? DATE_FILTER_OPERATORS : TEXT_FILTER_OPERATORS;
  const operatorEntries = useMemo(() => Object.entries(operatorLabels), [operatorLabels]);
  const sortDirection = sortState.columnKey === column.key ? sortState.direction : 'none';
  const filterActive = hasActiveFilter(column, filter);
  const writable = !!column.writableToD365;
  const canToggleWriteback = Boolean(isAdmin && typeof onToggleWriteback === 'function' && column.d365Field && column.writeBackAllowed !== false);

  useEffect(() => {
    if (open) {
      setDraft(getDraftFromFilter(column, filter));
    }
  }, [open, column, filter]);

  const handleOpenChange = useCallback((_, data) => {
    setOpen(data.open);
    if (!data.open) setShowCategoryBar(false);
  }, []);

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
  const toggleCategoryBar = useCallback(() => setShowCategoryBar((prev) => !prev), []);
  const triggerClassName = filterActive || sortDirection !== 'none' ? `${styles.trigger} ${styles.triggerActive}` : styles.trigger;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={triggerClassName}
          appearance="subtle"
          size="small"
          aria-label={`Sort and filter for ${column.label}`}
          data-column-menu-trigger="true"
        >
          ...
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <Text className={styles.fieldTitle}>{column.label}</Text>
        <div className={styles.divider} />
        <div className={styles.sortActions}>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortAsc}>
            Sort A to Z
          </Button>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortDesc}>
            Sort Z to A
          </Button>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={clearSort}>
            Clear sort
          </Button>
        </div>
        <div className={styles.divider} />
        <Button className={styles.sortButton} appearance="subtle" size="small" onClick={toggleCategoryBar}>
          {showCategoryBar ? 'Category bar (hide)' : 'Category bar (show)'}
        </Button>
        {showCategoryBar ? (
          <PurchaseOrderColumnGroupingSection
            column={column}
            isGroupingColumn={isGroupingColumn}
            groupingColor={groupingColor}
            onSetGroupingColumn={onSetGroupingColumn}
            onClearGrouping={onClearGrouping}
            onSetGroupingColor={onSetGroupingColor}
          />
        ) : null}
        {canToggleWriteback ? (
          <>
            <div className={styles.divider} />
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleWriteback}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <img src="/d365-sync-cloud.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                {writable ? 'Sync uitzetten' : 'Sync aanzetten'}
              </span>
            </Button>
          </>
        ) : null}
        <div className={styles.divider} />
        <Text className={styles.fieldTitle}>Filter</Text>
        <div className={styles.filterRow}>
          <Dropdown
            selectedOptions={[draft.operator]}
            value={operatorLabels[draft.operator]}
            onOptionSelect={handleOperatorSelect}
          >
            {operatorEntries.map(([key, label]) => (
              <Option key={key} value={key} text={label}>
                {label}
              </Option>
            ))}
          </Dropdown>
          {isDate && draft.operator === 'between' ? (
            <>
              <Input type="date" value={draft.value} onChange={handleValueChange} />
              <Input type="date" value={draft.secondaryValue} onChange={handleSecondaryValueChange} />
            </>
          ) : null}
          {isDate && (draft.operator === 'before' || draft.operator === 'after') ? (
            <Input type="date" value={draft.value} onChange={handleValueChange} />
          ) : null}
          {isDate && (draft.operator === 'inNextWeeks' || draft.operator === 'inNextDays') ? (
            <Input
              type="number"
              min={1}
              value={draft.value}
              onChange={handleValueChange}
              placeholder="Amount"
            />
          ) : null}
          {isDate && draft.operator === 'nextWeek' ? (
            <Text className={styles.hint}>Matches records in the next calendar week.</Text>
          ) : null}
          {!isDate ? (
            <Input
              value={draft.value}
              onChange={handleValueChange}
              placeholder={draft.operator === 'oneOf' ? 'Value1, Value2, Value3' : 'Value'}
            />
          ) : null}
          <div className={styles.actionRow}>
            <Button size="small" appearance="primary" onClick={handleApply}>
              Apply
            </Button>
            <Button size="small" appearance="secondary" onClick={handleClearFilter}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(PurchaseOrderColumnFilterMenu);
