import React, { memo, useCallback, useMemo } from 'react';
import {
  Button,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  DATE_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from '../../hooks/usePurchaseOrderTableView';

const useStyles = makeStyles({
  row: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  cell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px'),
    verticalAlign: 'top',
    minWidth: '220px',
  },
  controlCell: {
    minWidth: '96px',
    width: '96px',
    maxWidth: '96px',
    ...shorthands.padding('6px'),
  },
  controlStack: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  controlMeta: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  filterStack: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  compactInput: {
    minWidth: '170px',
  },
  datePair: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('6px'),
  },
  inlineButtons: {
    display: 'flex',
    ...shorthands.gap('6px'),
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
});

function getOperatorEntries(isDateColumn) {
  return isDateColumn
    ? Object.entries(DATE_FILTER_OPERATORS)
    : Object.entries(TEXT_FILTER_OPERATORS);
}

function ColumnFilterCell({
  column,
  filter,
  sortDirection,
  onToggleSort,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
}) {
  const styles = useStyles();
  const isDate = column.dataType === 'date';
  const operatorEntries = useMemo(() => getOperatorEntries(isDate), [isDate]);
  const defaultOperator = isDate ? 'before' : 'contains';
  const operator = filter?.operator || defaultOperator;
  const value = filter?.value || '';
  const secondaryValue = filter?.secondaryValue || '';

  const handleSortClick = useCallback(() => {
    onToggleSort(column.key);
  }, [column.key, onToggleSort]);

  const handleOperatorSelect = useCallback((_, data) => {
    if (!data.optionValue) return;
    onSetOperator(column.key, data.optionValue);
  }, [column.key, onSetOperator]);

  const handleValueChange = useCallback((event) => {
    onSetValue(column.key, event.target.value);
  }, [column.key, onSetValue]);

  const handleSecondaryValueChange = useCallback((event) => {
    onSetSecondaryValue(column.key, event.target.value);
  }, [column.key, onSetSecondaryValue]);

  const handleClearFilter = useCallback(() => {
    onClearFilter(column.key);
  }, [column.key, onClearFilter]);

  const sortButtonLabel = sortDirection === 'asc'
    ? 'Sorted ascending'
    : sortDirection === 'desc'
      ? 'Sorted descending'
      : 'Sort';

  return (
    <td className={styles.cell}>
      <div className={styles.filterStack}>
        <div className={styles.inlineButtons}>
          <Button
            size="small"
            appearance={sortDirection === 'none' ? 'secondary' : 'primary'}
            onClick={handleSortClick}
          >
            {sortButtonLabel}
          </Button>
          <Button size="small" appearance="subtle" onClick={handleClearFilter}>
            Clear
          </Button>
        </div>

        <Dropdown
          className={styles.compactInput}
          selectedOptions={[operator]}
          value={isDate ? DATE_FILTER_OPERATORS[operator] : TEXT_FILTER_OPERATORS[operator]}
          onOptionSelect={handleOperatorSelect}
        >
          {operatorEntries.map(([valueKey, label]) => (
            <Option key={valueKey} value={valueKey} text={label}>
              {label}
            </Option>
          ))}
        </Dropdown>

        {isDate && operator === 'between' ? (
          <div className={styles.datePair}>
            <Input
              className={styles.compactInput}
              type="date"
              value={value}
              onChange={handleValueChange}
            />
            <Input
              className={styles.compactInput}
              type="date"
              value={secondaryValue}
              onChange={handleSecondaryValueChange}
            />
          </div>
        ) : null}

        {isDate && (operator === 'before' || operator === 'after') ? (
          <Input
            className={styles.compactInput}
            type="date"
            value={value}
            onChange={handleValueChange}
          />
        ) : null}

        {isDate && (operator === 'inNextWeeks' || operator === 'inNextDays') ? (
          <Input
            className={styles.compactInput}
            type="number"
            min={1}
            value={value}
            onChange={handleValueChange}
            placeholder="Amount"
          />
        ) : null}

        {isDate && operator === 'nextWeek' ? (
          <Text className={styles.hint}>Matches dates in the upcoming calendar week.</Text>
        ) : null}

        {!isDate ? (
          <Input
            className={styles.compactInput}
            value={value}
            onChange={handleValueChange}
            placeholder={operator === 'oneOf' ? 'Value1, Value2, Value3' : 'Value'}
          />
        ) : null}
      </div>
    </td>
  );
}

function PurchaseOrderTableFilterRow({
  columns,
  filterByColumn,
  sortState,
  activeFilterCount,
  hasActiveSort,
  onToggleSort,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
  onClearAllFilters,
  onClearSort,
}) {
  const styles = useStyles();

  return (
    <tr className={styles.row}>
      <td className={`${styles.cell} ${styles.controlCell}`}>
        <div className={styles.controlStack}>
          <Button size="small" appearance="subtle" onClick={onClearAllFilters}>
            Clear filters
          </Button>
          <Button size="small" appearance="subtle" onClick={onClearSort}>
            Clear sort
          </Button>
          <Text className={styles.controlMeta}>
            Filters: {activeFilterCount} {hasActiveSort ? '| Sort active' : ''}
          </Text>
        </div>
      </td>

      {columns.map((column) => {
        const sortDirection = sortState.columnKey === column.key ? sortState.direction : 'none';
        return (
          <ColumnFilterCell
            key={`filter-${column.key}`}
            column={column}
            filter={filterByColumn[column.key]}
            sortDirection={sortDirection}
            onToggleSort={onToggleSort}
            onSetOperator={onSetOperator}
            onSetValue={onSetValue}
            onSetSecondaryValue={onSetSecondaryValue}
            onClearFilter={onClearFilter}
          />
        );
      })}
    </tr>
  );
}

export default memo(PurchaseOrderTableFilterRow);
