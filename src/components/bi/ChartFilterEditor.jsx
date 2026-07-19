import React, { memo, useCallback } from 'react';
import {
  Button, Dropdown, Field, Input, makeStyles, mergeClasses, Option, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import {
  DATE_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from '../../utils/tableViewFilterUtils';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalMNudge), minWidth: 0 },
  filterList: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalMNudge), minWidth: 0 },
  filterCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalMNudge),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: 0,
  },
  filterCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  filterTitle: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 },
  row: { display: 'flex', ...shorthands.gap(tokens.spacingHorizontalSNudge), alignItems: 'center', minWidth: 0 },
  grow: { flexGrow: 1, minWidth: 0 },
  label: { color: tokens.colorNeutralForeground2, fontWeight: tokens.fontWeightSemibold },
  labelCompact: { fontSize: tokens.fontSizeBase100 },
  empty: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function operatorsForColumn(column) {
  if (column?.dataType === 'date') return DATE_FILTER_OPERATORS;
  if (column?.dataType === 'number') return NUMBER_FILTER_OPERATORS;
  return TEXT_FILTER_OPERATORS;
}

function ChartFilterEditor({ columns, filters, onChange, compact = false, stacked = false }) {
  const styles = useStyles();
  const controlSize = compact ? 'small' : 'medium';
  const columnByKey = new Map(columns.map((col) => [col.key, col]));
  const safeFilters = filters || [];

  const addFilter = useCallback(() => {
    const first = columns[0];
    onChange([...safeFilters, {
      columnKey: first?.key || '',
      operator: first?.dataType === 'date' ? 'before' : first?.dataType === 'number' ? 'equals' : 'contains',
      value: '',
      secondaryValue: '',
    }]);
  }, [columns, safeFilters, onChange]);

  const updateFilter = useCallback((index, patch) => {
    onChange(safeFilters.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)));
  }, [safeFilters, onChange]);

  const removeFilter = useCallback((index) => {
    onChange(safeFilters.filter((_, i) => i !== index));
  }, [safeFilters, onChange]);

  const renderFilterFields = (filter, index, column, operatorLabels, inputType) => {
    if (stacked) {
      return (
        <div className={styles.filterCard} key={`${filter.columnKey}-${index}`}>
          <div className={styles.filterCardHeader}>
            <Text size={200} className={styles.filterTitle}>Filter {index + 1}</Text>
            <Button
              appearance="subtle"
              size="small"
              icon={<DeleteRegular />}
              aria-label="Remove filter"
              onClick={() => removeFilter(index)}
            />
          </div>
          <Field label="Column" size={controlSize}>
            <Dropdown
              size={controlSize}
              selectedOptions={[filter.columnKey]}
              value={column?.label || ''}
              onOptionSelect={(_, data) => {
                const nextCol = columnByKey.get(data.optionValue);
                updateFilter(index, {
                  columnKey: data.optionValue,
                  operator: nextCol?.dataType === 'date' ? 'before' : nextCol?.dataType === 'number' ? 'equals' : 'contains',
                });
              }}
            >
              {columns.map((col) => (<Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>))}
            </Dropdown>
          </Field>
          <Field label="Operator" size={controlSize}>
            <Dropdown
              size={controlSize}
              selectedOptions={[filter.operator]}
              value={operatorLabels[filter.operator] || ''}
              onOptionSelect={(_, data) => updateFilter(index, { operator: data.optionValue })}
            >
              {Object.entries(operatorLabels).map(([key, label]) => (
                <Option key={key} value={key} text={label}>{label}</Option>
              ))}
            </Dropdown>
          </Field>
          {filter.operator !== 'nextWeek' ? (
            <Field label="Value" size={controlSize}>
              <Input
                size={controlSize}
                type={inputType}
                value={filter.value}
                placeholder="Value"
                onChange={(_, data) => updateFilter(index, { value: data.value })}
              />
            </Field>
          ) : null}
          {filter.operator === 'between' ? (
            <Field label="To" size={controlSize}>
              <Input
                size={controlSize}
                type={inputType}
                value={filter.secondaryValue}
                placeholder="To"
                onChange={(_, data) => updateFilter(index, { secondaryValue: data.value })}
              />
            </Field>
          ) : null}
        </div>
      );
    }

    return (
      <div className={styles.row} key={`${filter.columnKey}-${index}`}>
        <Dropdown
          className={styles.grow}
          size={controlSize}
          selectedOptions={[filter.columnKey]}
          value={column?.label || ''}
          onOptionSelect={(_, data) => {
            const nextCol = columnByKey.get(data.optionValue);
            updateFilter(index, {
              columnKey: data.optionValue,
              operator: nextCol?.dataType === 'date' ? 'before' : nextCol?.dataType === 'number' ? 'equals' : 'contains',
            });
          }}
        >
          {columns.map((col) => (<Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>))}
        </Dropdown>
        <Dropdown
          size={controlSize}
          selectedOptions={[filter.operator]}
          value={operatorLabels[filter.operator] || ''}
          onOptionSelect={(_, data) => updateFilter(index, { operator: data.optionValue })}
        >
          {Object.entries(operatorLabels).map(([key, label]) => (
            <Option key={key} value={key} text={label}>{label}</Option>
          ))}
        </Dropdown>
        {filter.operator !== 'nextWeek' ? (
          <Input
            className={styles.grow}
            size={controlSize}
            type={inputType}
            value={filter.value}
            placeholder="Value"
            onChange={(_, data) => updateFilter(index, { value: data.value })}
          />
        ) : null}
        {filter.operator === 'between' ? (
          <Input
            className={styles.grow}
            size={controlSize}
            type={inputType}
            value={filter.secondaryValue}
            placeholder="To"
            onChange={(_, data) => updateFilter(index, { secondaryValue: data.value })}
          />
        ) : null}
        <Button
          appearance="subtle"
          size={controlSize}
          icon={<DeleteRegular />}
          aria-label="Remove filter"
          onClick={() => removeFilter(index)}
        />
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {!stacked ? (
        <Text className={mergeClasses(styles.label, compact && styles.labelCompact)}>Filters</Text>
      ) : null}
      <div className={styles.filterList}>
        {safeFilters.map((filter, index) => {
          const column = columnByKey.get(filter.columnKey);
          const operatorLabels = operatorsForColumn(column);
          const inputType = column?.dataType === 'number' ? 'number' : column?.dataType === 'date' ? 'date' : 'text';
          return renderFilterFields(filter, index, column, operatorLabels, inputType);
        })}
      </div>
      {!safeFilters.length ? (
        <Text className={styles.empty}>No filters applied.</Text>
      ) : null}
      <div>
        <Button size={controlSize} appearance="secondary" icon={<AddRegular />} onClick={addFilter}>
          Add filter
        </Button>
      </div>
    </div>
  );
}

export default memo(ChartFilterEditor);
