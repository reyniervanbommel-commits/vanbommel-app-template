import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dropdown,
  Field,
  Input,
  Option,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import PurchaseOrderColumnColorFilterSection from './PurchaseOrderColumnColorFilterSection';
import PurchaseOrderColumnFilterValuePicker from './PurchaseOrderColumnFilterValuePicker';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';
import { getDraftFromFilter, isDateColumn, isNumberColumn } from './purchaseOrderColumnFilterMenuConstants';
import { usePurchaseOrderColorFilter } from '../../hooks/usePurchaseOrderColorFilter';
import { getUniqueColumnValues } from '../../utils/columnUniqueValues';
import {
  DATE_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from '../../utils/tableViewFilterUtils';

const FIELD_CONTAINER_STYLE = { maxWidth: '520px' };
const EMPTY_ITEMS = [];
const EMPTY_COLUMNS = [];
const EMPTY_FILTERS = {};
const EMPTY_DATE_PERIOD_MODES = {};
const EMPTY_FORMAT_RULES = {};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('4px', '0'),
  },
  field: {
    width: '100%',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    ...shorthands.gap('8px'),
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function getOperatorLabels(isDate, isNumber) {
  if (isDate) return DATE_FILTER_OPERATORS;
  if (isNumber) return NUMBER_FILTER_OPERATORS;
  return TEXT_FILTER_OPERATORS;
}

function getValueInputType(isDate, isNumber, operator) {
  if (isDate && (operator === 'before' || operator === 'after' || operator === 'equals')) return 'date';
  if (isNumber || operator === 'inNextWeeks' || operator === 'inNextDays') return 'number';
  return 'text';
}

export default function PurchaseOrdersActiveFilterEditor({
  item,
  applyColumnFilter,
  setColumnColorFilter,
  items = EMPTY_ITEMS,
  headerColumns = EMPTY_COLUMNS,
  filterByColumn = EMPTY_FILTERS,
  datePeriodDisplayModes = EMPTY_DATE_PERIOD_MODES,
  headerColumnFormatRules = EMPTY_FORMAT_RULES,
  lineColumnFormatRules = EMPTY_FORMAT_RULES,
}) {
  const styles = useStyles();
  const menuStyles = usePurchaseOrderColumnFilterMenuStyles();
  const column = item?.column || {};
  const columnKey = item?.columnKey || column.key;
  const columnLabel = column.label || columnKey || 'Column';
  const isDate = isDateColumn(column);
  const isNumber = isNumberColumn(column, datePeriodDisplayModes);
  const [draft, setDraft] = useState(() => getDraftFromFilter(column, item?.filter, datePeriodDisplayModes));

  useEffect(() => {
    setDraft(getDraftFromFilter(column, item?.filter, datePeriodDisplayModes));
  }, [column, item?.filter, datePeriodDisplayModes]);

  const operatorLabels = getOperatorLabels(isDate, isNumber);
  const operatorEntries = useMemo(() => Object.entries(operatorLabels), [operatorLabels]);
  const selectedOperatorLabel = operatorLabels[draft.operator] || draft.operator;

  const uniqueColumnValues = useMemo(() => {
    if (isDate) return [];
    return getUniqueColumnValues(column, items, headerColumns, filterByColumn, datePeriodDisplayModes);
  }, [isDate, column, items, headerColumns, filterByColumn, datePeriodDisplayModes]);

  const mergedColumnFormatRules = useMemo(
    () => ({ ...headerColumnFormatRules, ...lineColumnFormatRules }),
    [headerColumnFormatRules, lineColumnFormatRules]
  );

  const colorFilter = usePurchaseOrderColorFilter({
    column,
    filter: item?.filter,
    columnFormatRuleSet: mergedColumnFormatRules[columnKey] || null,
    columns: headerColumns,
    columnFormatRules: mergedColumnFormatRules,
    onSetColumnColorFilter: setColumnColorFilter,
  });

  const handleOperatorSelect = useCallback((_, data) => {
    if (!data.optionValue) return;
    setDraft((prev) => ({ ...prev, operator: data.optionValue }));
  }, []);

  const handleValueChange = useCallback((event) => {
    setDraft((prev) => ({ ...prev, value: event.target.value }));
  }, []);

  const handleDraftValueChange = useCallback((nextValue) => {
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, []);

  const handleSecondaryValueChange = useCallback((event) => {
    setDraft((prev) => ({ ...prev, secondaryValue: event.target.value }));
  }, []);

  const handleApply = useCallback(() => {
    const patch = {
      operator: draft.operator,
      value: draft.value,
      secondaryValue: draft.secondaryValue,
    };
    startTransition(() => {
      applyColumnFilter(columnKey, patch);
    });
  }, [applyColumnFilter, columnKey, draft]);

  const usesValuePicker = draft.operator === 'equals' || draft.operator === 'oneOf';
  const showBetween = (isDate || isNumber) && draft.operator === 'between';
  const showSingleValue = !usesValuePicker && !showBetween && !(isDate && draft.operator === 'nextWeek');
  const inputType = getValueInputType(isDate, isNumber, draft.operator);

  return (
    <div className={styles.root}>
      <Field label="Operator" className={styles.field} style={FIELD_CONTAINER_STYLE}>
        <Dropdown
          selectedOptions={[draft.operator]}
          value={selectedOperatorLabel}
          onOptionSelect={handleOperatorSelect}
          aria-label={`Filter operator for ${columnLabel}`}
        >
          {operatorEntries.map(([operator, label]) => (
            <Option key={operator} value={operator}>
              {label}
            </Option>
          ))}
        </Dropdown>
      </Field>

      {usesValuePicker ? (
        <Field label="Value" className={styles.field} style={FIELD_CONTAINER_STYLE}>
          <PurchaseOrderColumnFilterValuePicker
            mode={draft.operator === 'oneOf' ? 'multi' : 'single'}
            value={draft.value}
            onChange={handleDraftValueChange}
            uniqueValues={uniqueColumnValues}
            isNumber={isNumber}
            columnLabel={columnLabel}
          />
        </Field>
      ) : null}

      {showSingleValue ? (
        <Field label="Value" className={styles.field} style={FIELD_CONTAINER_STYLE}>
          <Input
            type={inputType}
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Value"
            aria-label={`Filter value for ${columnLabel}`}
          />
        </Field>
      ) : null}

      {showBetween ? (
        <Field label="Value range" className={styles.field} style={FIELD_CONTAINER_STYLE}>
          <div className={styles.valueRow}>
            <Input
              type={isDate ? 'date' : 'number'}
              value={draft.value}
              onChange={handleValueChange}
              placeholder="From"
              aria-label={`Filter from value for ${columnLabel}`}
            />
            <Input
              type={isDate ? 'date' : 'number'}
              value={draft.secondaryValue}
              onChange={handleSecondaryValueChange}
              placeholder="To"
              aria-label={`Filter to value for ${columnLabel}`}
            />
          </div>
        </Field>
      ) : null}

      {isDate && draft.operator === 'nextWeek' ? (
        <span className={styles.hint}>Matches records in the next calendar week.</span>
      ) : null}

      <div className={styles.actionRow}>
        <Button appearance="primary" size="small" onClick={handleApply}>
          Apply
        </Button>
      </div>

      {colorFilter.supported ? (
        <PurchaseOrderColumnColorFilterSection
          styles={menuStyles}
          columnLabel={columnLabel}
          availableColors={colorFilter.availableColors}
          selectedColors={colorFilter.selectedColors}
          onToggleColor={colorFilter.toggleColor}
          onClear={colorFilter.clear}
        />
      ) : null}
    </div>
  );
}
