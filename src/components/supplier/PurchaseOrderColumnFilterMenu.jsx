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
    cursor: 'pointer',
    flexShrink: 0,
    ':hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  triggerActive: {
    color: tokens.colorBrandForeground1,
  },
  surface: {
    ...shorthands.padding('0'),
    width: 'auto',
    maxWidth: 'none',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mainPane: {
    width: '280px',
    minWidth: '280px',
    boxSizing: 'border-box',
    ...shorthands.padding('8px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  subPane: {
    width: '210px',
    minWidth: '210px',
    boxSizing: 'border-box',
    ...shorthands.padding('8px'),
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  subPaneTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
  },
  submenuButton: {
    justifyContent: 'space-between',
  },
  submenuButtonActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
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

// Monday-stijl kolomtypes voor "Kolom rechts toevoegen". label = standaardnaam
// (direct inline te hernoemen); dataType mapt op de backend-datatypes.
const NEW_COLUMN_TYPES = [
  { key: 'status', label: 'Status', dataType: 'select', options: ['Nieuw', 'Bezig', 'Klaar'] },
  { key: 'text', label: 'Tekst', dataType: 'text' },
  { key: 'number', label: 'Nummers', dataType: 'number' },
  { key: 'date', label: 'Datum', dataType: 'date' },
  { key: 'boolean', label: 'Ja/nee', dataType: 'boolean' },
];

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
  onAddColumnRightOf,
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  // Zijpaneel-submenu: 'none' | 'group' (categorie/groeperen) | 'add' (kolom rechts toevoegen).
  const [activeSubmenu, setActiveSubmenu] = useState('none');
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
        <div className={styles.mainPane}>
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
        <Button
          className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'group' ? styles.submenuButtonActive : ''}`}
          appearance="subtle"
          size="small"
          onClick={() => toggleSubmenu('group')}
        >
          <span>Categorie / groeperen</span>
          <span aria-hidden>›</span>
        </Button>
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
        {canAddColumn ? (
          <>
            <div className={styles.divider} />
            <Button
              className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'add' ? styles.submenuButtonActive : ''}`}
              appearance="subtle"
              size="small"
              onClick={() => toggleSubmenu('add')}
            >
              <span>+ Kolom rechts toevoegen</span>
              <span aria-hidden>›</span>
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
        </div>

        {activeSubmenu === 'add' ? (
          <div className={styles.subPane}>
            <Text className={styles.subPaneTitle}>Kolomtype</Text>
            {NEW_COLUMN_TYPES.map((type) => (
              <Button
                key={type.key}
                className={styles.sortButton}
                appearance="subtle"
                size="small"
                onClick={() => handleAddType(type)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        ) : null}

        {activeSubmenu === 'group' ? (
          <div className={styles.subPane}>
            <Text className={styles.subPaneTitle}>Categorie / groeperen</Text>
            <PurchaseOrderColumnGroupingSection
              column={column}
              isGroupingColumn={isGroupingColumn}
              groupingColor={groupingColor}
              onSetGroupingColumn={onSetGroupingColumn}
              onClearGrouping={onClearGrouping}
              onSetGroupingColor={onSetGroupingColor}
            />
          </div>
        ) : null}
      </PopoverSurface>
    </Popover>
  );
}

export default memo(PurchaseOrderColumnFilterMenu);
