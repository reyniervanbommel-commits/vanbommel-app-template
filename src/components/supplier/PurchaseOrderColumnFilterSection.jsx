import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Input, Option, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
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

function getDefaultOperator(isDate) {
  return isDate ? 'before' : 'contains';
}

function getDraftFromFilter(isDate, filter) {
  return {
    operator: filter?.operator || getDefaultOperator(isDate),
    value: filter?.value || '',
    secondaryValue: filter?.secondaryValue || '',
  };
}

// Filter-subsectie van het kolommenmenu. Bevat de draft-state en apply/clear-gedrag
// die voorheen inline in PurchaseOrderColumnFilterMenu stonden (1:1 verplaatst). De
// sectie mount pas als de popover open is, dus de draft wordt bij elke opening vers
// geïnitialiseerd; de effect-sync houdt hem gelijk als filter/column extern wijzigt.
function PurchaseOrderColumnFilterSection({
  column,
  filter,
  isDate,
  operatorLabels,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
  onClose,
}) {
  const styles = useStyles();
  const [draft, setDraft] = useState(() => getDraftFromFilter(isDate, filter));
  const operatorEntries = useMemo(() => Object.entries(operatorLabels), [operatorLabels]);

  useEffect(() => {
    setDraft(getDraftFromFilter(isDate, filter));
  }, [column, filter, isDate]);

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
    onClose();
  }, [column.key, draft, isDate, onSetOperator, onSetSecondaryValue, onSetValue, onClose]);

  const handleClearFilter = useCallback(() => {
    onClearFilter(column.key);
    onClose();
  }, [column.key, onClearFilter, onClose]);

  return (
    <>
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
    </>
  );
}

export default PurchaseOrderColumnFilterSection;
