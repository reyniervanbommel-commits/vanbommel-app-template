import React, { memo, useCallback, useMemo } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, SaveRegular, FilterRegular } from '@fluentui/react-icons';
import { useSyncFilters, valueTypeForColumn, ENUM_FIELDS } from '../../../hooks/useSyncFilters';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  titleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
  fieldDropdown: { minWidth: '200px' },
  operatorDropdown: { minWidth: '150px' },
  valueInput: { minWidth: '200px', flex: '1 1 auto' },
  preview: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding('8px', '12px'),
    ...shorthands.borderRadius('6px'),
    wordBreak: 'break-all',
  },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: tokens.fontSizeBase200 },
  saved: { color: tokens.colorPaletteGreenForeground1, fontSize: tokens.fontSizeBase200 },
});

const OPERATOR_LABELS = {
  eq: 'equals',
  ne: 'not equals',
  gt: 'greater than',
  ge: 'greater or equal',
  lt: 'less than',
  le: 'less or equal',
  contains: 'contains',
};

function operatorsForType(valueType) {
  if (valueType === 'enum') return ['eq', 'ne'];
  if (valueType === 'text') return ['eq', 'ne', 'contains'];
  return ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
}

function RuleRow({ rule, index, fieldOptions, onUpdate, onRemove }) {
  const styles = useStyles();
  const column = fieldOptions.find((c) => c.d365Field === rule.field) || null;
  const enumMeta = rule.field ? ENUM_FIELDS[rule.field] : null;
  const operators = operatorsForType(rule.valueType);

  const handleField = useCallback((_, data) => {
    const next = fieldOptions.find((c) => c.d365Field === data.optionValue);
    if (!next) return;
    const valueType = valueTypeForColumn(next);
    onUpdate(index, {
      field: next.d365Field,
      valueType,
      enumType: valueType === 'enum' ? ENUM_FIELDS[next.d365Field].enumType : undefined,
      operator: 'eq',
      value: '',
    });
  }, [fieldOptions, index, onUpdate]);

  const handleOperator = useCallback((_, data) => onUpdate(index, { operator: data.optionValue }), [index, onUpdate]);
  const handleValueInput = useCallback((e) => onUpdate(index, { value: e.target.value }), [index, onUpdate]);
  const handleEnumValue = useCallback((_, data) => onUpdate(index, { value: data.optionValue }), [index, onUpdate]);
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div className={styles.ruleRow}>
      <Dropdown
        className={styles.fieldDropdown}
        placeholder="Select field"
        value={column ? `${column.label} (${column.d365Field})` : ''}
        selectedOptions={rule.field ? [rule.field] : []}
        onOptionSelect={handleField}
        aria-label={`Filter field for rule ${index + 1}`}
      >
        {fieldOptions.map((c) => (
          <Option key={c.d365Field} value={c.d365Field} text={`${c.label} (${c.d365Field})`}>
            {c.label} ({c.d365Field})
          </Option>
        ))}
      </Dropdown>

      <Dropdown
        className={styles.operatorDropdown}
        value={OPERATOR_LABELS[rule.operator] || rule.operator}
        selectedOptions={[rule.operator]}
        onOptionSelect={handleOperator}
        aria-label={`Operator for rule ${index + 1}`}
      >
        {operators.map((op) => (
          <Option key={op} value={op} text={OPERATOR_LABELS[op]}>{OPERATOR_LABELS[op]}</Option>
        ))}
      </Dropdown>

      {rule.valueType === 'enum' && enumMeta ? (
        <Dropdown
          className={styles.valueInput}
          placeholder="Select value"
          value={rule.value || ''}
          selectedOptions={rule.value ? [rule.value] : []}
          onOptionSelect={handleEnumValue}
          aria-label={`Value for rule ${index + 1}`}
        >
          {enumMeta.members.map((member) => (
            <Option key={member} value={member} text={member}>{member}</Option>
          ))}
        </Dropdown>
      ) : (
        <Input
          className={styles.valueInput}
          type={rule.valueType === 'number' ? 'number' : rule.valueType === 'date' ? 'date' : 'text'}
          placeholder="Value"
          value={String(rule.value ?? '')}
          onChange={handleValueInput}
          aria-label={`Value for rule ${index + 1}`}
        />
      )}

      <Button
        appearance="subtle"
        icon={<DeleteRegular />}
        onClick={handleRemove}
        aria-label={`Remove rule ${index + 1}`}
      />
    </div>
  );
}

/**
 * Admin-builder voor D365-syncfilters: regels (veld/operator/waarde) worden server-side
 * gecompileerd naar een OData $filter en toegepast in de call naar D365. Zo wordt er
 * minder data opgehaald en blijft de load op D365 en de sync beperkt.
 */
function SyncFilterBuilder({ headerColumns, syncFilter }) {
  const styles = useStyles();

  // Alleen echte D365-velden zijn filterbaar (afgeleide/custom kolommen niet).
  const fieldOptions = useMemo(
    () => headerColumns.filter((c) => c.source === 'd365' && c.d365Field),
    [headerColumns]
  );

  const {
    rules, preview, addRule, updateRule, removeRule, save, saving, error, savedAt,
  } = useSyncFilters(syncFilter?.rules);

  const handleAdd = useCallback(() => addRule(), [addRule]);

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <FilterRegular />
        <Text weight="semibold" size={400}>D365 sync filters</Text>
        {rules.length ? (
          <Badge appearance="tint" color="brand" size="small">{rules.length} active rule{rules.length === 1 ? '' : 's'}</Badge>
        ) : (
          <Badge appearance="tint" color="warning" size="small">No filter: full dataset up to the cap</Badge>
        )}
      </div>
      <Text className={styles.hint} block>
        These filters are applied inside the OData call to D365, so less data is fetched and the
        load on D365 stays low. Changes take effect on the next sync (Refresh on the Purchase
        Orders screen). Rules are combined with AND.
      </Text>

      {rules.map((rule, index) => (
        <RuleRow
          key={index}
          rule={rule}
          index={index}
          fieldOptions={fieldOptions}
          onUpdate={updateRule}
          onRemove={removeRule}
        />
      ))}

      {preview ? <div className={styles.preview}>$filter = {preview}</div> : null}
      {syncFilter?.rawFilter ? (
        <Text className={styles.hint} block>
          Advanced raw filter (OData tab) is also active and combined with AND:{' '}
          <span className={styles.preview}>{syncFilter.rawFilter}</span>
        </Text>
      ) : null}

      <div className={styles.actions}>
        <Button appearance="secondary" icon={<AddRegular />} onClick={handleAdd}>
          Add filter
        </Button>
        <Button appearance="primary" icon={<SaveRegular />} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save filters'}
        </Button>
        {error ? <Text className={styles.error}>{error}</Text> : null}
        {savedAt ? <Text className={styles.saved}>Saved — applied on next sync</Text> : null}
      </div>
    </div>
  );
}

export default memo(SyncFilterBuilder);
