import React, { memo, useCallback, useState } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { DATE_FILTER_OPERATORS, TEXT_FILTER_OPERATORS } from '../../hooks/usePurchaseOrderTableView';
import PurchaseOrderColumnGroupingSection from './PurchaseOrderColumnGroupingSection';
import PurchaseOrderColumnFilterSection from './PurchaseOrderColumnFilterSection';
import PurchaseOrderColumnMenuActions from './PurchaseOrderColumnMenuActions';
import PurchaseOrderAddColumnPane from './PurchaseOrderAddColumnPane';

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
  divider: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  fieldTitle: {
    fontWeight: tokens.fontWeightSemibold,
  },
});

function isDateColumn(column) {
  return column?.dataType === 'date';
}

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
  availableColumns = [],
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
  onRemoveColumn,
  isLineColumnSummed = false,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  // Zijpaneel-submenu: 'none' | 'group' (categorie/groeperen) | 'add' (kolom rechts toevoegen).
  const [activeSubmenu, setActiveSubmenu] = useState('none');
  const isDate = isDateColumn(column);
  // Image-kolommen zijn afgeleid en hebben geen opgeslagen waarde: filteren is zinloos.
  const isImage = column?.dataType === 'image';
  const isGroupingColumn = groupingColumnKey === column.key;
  const operatorLabels = isDate ? DATE_FILTER_OPERATORS : TEXT_FILTER_OPERATORS;
  const sortDirection = sortState.columnKey === column.key ? sortState.direction : 'none';
  const filterActive = isColumnFilterActive(column, filter);
  const canAddColumn = typeof onAddColumnRightOf === 'function';

  const handleOpenChange = useCallback((_, data) => {
    setOpen(data.open);
    if (!data.open) setActiveSubmenu('none');
  }, []);

  const toggleSubmenu = useCallback((name) => {
    setActiveSubmenu((prev) => (prev === name ? 'none' : name));
  }, []);

  const closePopover = useCallback(() => setOpen(false), []);

  // Voegt de gekozen kolom rechts toe en sluit het menu (zelfde afsluitgedrag voor
  // alle types, inclusief de image-config die via de sub-pane binnenkomt).
  const handleAddType = useCallback((typeDef) => {
    onAddColumnRightOf(column, typeDef);
    setActiveSubmenu('none');
    setOpen(false);
  }, [column, onAddColumnRightOf]);

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
          <PurchaseOrderColumnMenuActions
            column={column}
            isAdmin={isAdmin}
            activeSubmenu={activeSubmenu}
            onToggleSubmenu={toggleSubmenu}
            onClose={closePopover}
            canAddColumn={canAddColumn}
            isLineColumnSummed={isLineColumnSummed}
            onSetSortDirection={onSetSortDirection}
            onToggleWriteback={onToggleWriteback}
            onRemoveColumn={onRemoveColumn}
            onToggleLineColumnSum={onToggleLineColumnSum}
            onPushLineTotalToHeader={onPushLineTotalToHeader}
            onPushLineValuesToHeader={onPushLineValuesToHeader}
          />
          {isImage ? null : (
            <>
              <div className={styles.divider} />
              <PurchaseOrderColumnFilterSection
                column={column}
                filter={filter}
                isDate={isDate}
                operatorLabels={operatorLabels}
                onSetOperator={onSetOperator}
                onSetValue={onSetValue}
                onSetSecondaryValue={onSetSecondaryValue}
                onClearFilter={onClearFilter}
                onClose={closePopover}
              />
            </>
          )}
        </div>

        {activeSubmenu === 'add' ? (
          <div className={styles.subPane}>
            <PurchaseOrderAddColumnPane
              availableColumns={availableColumns}
              onConfirm={handleAddType}
            />
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
