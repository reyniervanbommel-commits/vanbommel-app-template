import React, { memo, useCallback } from 'react';
import { Button, Dropdown, Input, makeStyles, Option, shorthands, Text, tokens } from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import {
  DATE_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from '../../utils/tableViewFilterUtils';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('8px') },
  row: { display: 'flex', ...shorthands.gap('6px'), alignItems: 'center' },
  grow: { flexGrow: 1, minWidth: 0 },
  label: { color: tokens.colorNeutralForeground2, fontWeight: 600 },
});

function operatorsForColumn(column) {
  if (column?.dataType === 'date') return DATE_FILTER_OPERATORS;
  if (column?.dataType === 'number') return NUMBER_FILTER_OPERATORS;
  return TEXT_FILTER_OPERATORS;
}

function ChartFilterEditor({ columns, filters, onChange }) {
  const styles = useStyles();
  const columnByKey = new Map(columns.map((col) => [col.key, col]));

  const addFilter = useCallback(() => {
    const first = columns[0];
    onChange([...(filters || []), {
      columnKey: first?.key || '',
      operator: first?.dataType === 'date' ? 'before' : first?.dataType === 'number' ? 'equals' : 'contains',
      value: '',
      secondaryValue: '',
    }]);
  }, [columns, filters, onChange]);

  const updateFilter = useCallback((index, patch) => {
    onChange(filters.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)));
  }, [filters, onChange]);

  const removeFilter = useCallback((index) => {
    onChange(filters.filter((_, i) => i !== index));
  }, [filters, onChange]);

  return (
    <div className={styles.root}>
      <Text className={styles.label}>Filters</Text>
      {(filters || []).map((filter, index) => {
        const column = columnByKey.get(filter.columnKey);
        const operatorLabels = operatorsForColumn(column);
        const inputType = column?.dataType === 'number' ? 'number' : column?.dataType === 'date' ? 'date' : 'text';
        return (
          <div className={styles.row} key={`${filter.columnKey}-${index}`}>
            <Dropdown
              className={styles.grow}
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
                type={inputType}
                value={filter.value}
                placeholder="Value"
                onChange={(_, data) => updateFilter(index, { value: data.value })}
              />
            ) : null}
            {filter.operator === 'between' ? (
              <Input
                className={styles.grow}
                type={inputType}
                value={filter.secondaryValue}
                placeholder="To"
                onChange={(_, data) => updateFilter(index, { secondaryValue: data.value })}
              />
            ) : null}
            <Button
              appearance="subtle"
              icon={<DeleteRegular />}
              aria-label="Remove filter"
              onClick={() => removeFilter(index)}
            />
          </div>
        );
      })}
      <div>
        <Button size="small" appearance="secondary" icon={<AddRegular />} onClick={addFilter}>Add filter</Button>
      </div>
    </div>
  );
}

export default memo(ChartFilterEditor);
