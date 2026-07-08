import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { AddRegular, DeleteRegular, SaveRegular, FilterRegular, ArrowResetRegular, NumberSymbolRegular } from '@fluentui/react-icons';
import { useSyncFilters, ENUM_FIELDS } from '../../../hooks/useSyncFilters';
import FilterFieldPickerDialog, { OPERATOR_LABELS } from './FilterFieldPickerDialog';

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
  ruleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  levelDropdown: { minWidth: '170px' },
  operatorDropdown: { minWidth: '190px' },
  valueInput: { minWidth: '220px', flex: '1 1 auto' },
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
  fieldBadge: { maxWidth: '420px' },
});

function operatorsForType(valueType) {
  if (valueType === 'text') return ['eq', 'ne', 'contains', 'notcontains', 'startswith', 'notstartswith', 'oneof'];
  if (valueType === 'enum') return ['eq', 'ne', 'oneof'];
  return ['eq', 'ne', 'oneof'];
}

function RuleRow({ rule, index, onUpdate, onRemove, onOpenPicker }) {
  const styles = useStyles();
  const enumMeta = rule.field ? ENUM_FIELDS[rule.field] : null;
  const operators = operatorsForType(rule.valueType);
  const selectedOperator = operators.includes(rule.operator) ? rule.operator : operators[0];
  const availableFieldCount = rule.availableFieldCount || 0;
  const hasAvailableFields = availableFieldCount > 0;
  const pickerDisabledReason = hasAvailableFields
    ? ''
    : 'No fields with sampled values for this level yet. Run Sync now first.';

  return (
    <div className={styles.ruleRow}>
      <Dropdown
        className={styles.levelDropdown}
        selectedOptions={[rule.level || 'header']}
        value={rule.level === 'line' ? 'Subitems (Lines)' : 'Main items (Headers)'}
        onOptionSelect={(_, data) => onUpdate(index, { level: data.optionValue, field: '', value: '', valueType: 'text', operator: 'eq' })}
      >
        <Option value="header" text="Main items (Headers)">Main items (Headers)</Option>
        <Option value="line" text="Subitems (Lines)">Subitems (Lines)</Option>
      </Dropdown>

      <Button
        appearance="secondary"
        onClick={() => onOpenPicker(index, rule.level || 'header')}
        disabled={!hasAvailableFields}
        title={pickerDisabledReason}
      >
        {rule.field ? 'Change field' : 'Choose field'}
      </Button>
      <Badge className={styles.fieldBadge} appearance="outline" color={rule.field ? 'brand' : 'subtle'}>
        {rule.field ? `${rule.label || rule.field} (${rule.field})` : 'No field selected'}
      </Badge>

      <Dropdown
        className={styles.operatorDropdown}
        selectedOptions={[selectedOperator]}
        value={OPERATOR_LABELS[selectedOperator]}
        onOptionSelect={(_, data) => onUpdate(index, { operator: data.optionValue })}
      >
        {operators.map((op) => (
          <Option key={op} value={op} text={OPERATOR_LABELS[op]}>{OPERATOR_LABELS[op]}</Option>
        ))}
      </Dropdown>

      {rule.valueType === 'enum' && enumMeta && selectedOperator !== 'oneof' ? (
        <Dropdown
          className={styles.valueInput}
          placeholder="Select value"
          value={rule.value || ''}
          selectedOptions={rule.value ? [rule.value] : []}
          onOptionSelect={(_, data) => onUpdate(index, { value: data.optionValue })}
        >
          {enumMeta.members.map((member) => (
            <Option key={member} value={member} text={member}>{member}</Option>
          ))}
        </Dropdown>
      ) : (
        <Input
          className={styles.valueInput}
          type={rule.valueType === 'number' ? 'number' : rule.valueType === 'date' ? 'date' : 'text'}
          placeholder={selectedOperator === 'oneof' ? 'Value1, Value2, Value3' : 'Value'}
          value={String(rule.value ?? '')}
          onChange={(e) => onUpdate(index, { value: e.target.value })}
        />
      )}

      <Button appearance="subtle" icon={<DeleteRegular />} onClick={() => onRemove(index)} />
    </div>
  );
}

function SyncFilterBuilder({ tableKey = 'purchase-orders', filterCatalog, syncFilter, onSyncNow }) {
  const styles = useStyles();
  const [pickerState, setPickerState] = useState({ open: false, index: null, level: null });
  const isReadOnly = Boolean(syncFilter?.readOnly);
  const readOnlyMessage = String(syncFilter?.message || '').trim();
  const inheritedCompiled = String(syncFilter?.inheritedCompiled || '').trim();
  const {
    rules, preview, addRule, updateRule, removeRule, applyRules, resetRules, countRows,
    save, saving, error, savedAt, queryCount, countLoading, countError,
  } = useSyncFilters(syncFilter?.rules, tableKey);

  const templates = syncFilter?.templates || [];
  const activeRules = useMemo(() => rules.filter((r) => r.field && r.value !== '' && r.value !== null && r.value !== undefined), [rules]);

  const fieldsForLevel = useCallback(
    (level) => (level === 'line' ? (filterCatalog?.line || []) : (filterCatalog?.header || [])),
    [filterCatalog]
  );
  const openPicker = useCallback(
    (index, level) => {
      const safeLevel = level === 'line' ? 'line' : 'header';
      setPickerState({ open: true, index, level: safeLevel });
    },
    []
  );
  const closePicker = useCallback(() => setPickerState({ open: false, index: null, level: null }), []);
  const pickerLevel = pickerState.level || 'header';
  const pickerFields = fieldsForLevel(pickerLevel);

  const handlePickField = useCallback((field, operator) => {
    if (pickerState.index === null) return;
    updateRule(pickerState.index, {
      field: field.field,
      label: field.label,
      valueType: field.valueType || 'text',
      enumType: field.valueType === 'enum' ? 'PurchStatus' : undefined,
      operator,
      value: '',
    });
    closePicker();
  }, [pickerState.index, updateRule, closePicker]);

  if (isReadOnly) {
    return (
      <div className={styles.section}>
        <div className={styles.titleRow}>
          <FilterRegular />
          <Text weight="semibold" size={400}>D365 sync filters</Text>
          <Badge appearance="tint" color="informative" size="small">Inherited</Badge>
        </div>
        <Text className={styles.hint} block>
          {readOnlyMessage || 'This table inherits the active Purchase Orders sync filter.'}
        </Text>
        {inheritedCompiled ? <div className={styles.preview}>Inherited $filter = {inheritedCompiled}</div> : null}
        <div className={styles.actions}>
          <Button appearance="secondary" onClick={onSyncNow}>Sync now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <FilterRegular />
        <Text weight="semibold" size={400}>D365 sync filters</Text>
        <Badge appearance="tint" color={activeRules.length ? 'brand' : 'warning'} size="small">
          {activeRules.length ? `${activeRules.length} active` : 'No active filter'}
        </Badge>
      </div>
      <Text className={styles.hint} block>
        Filters are applied directly in the D365 OData call (headers + subitems). This reduces D365 load,
        network traffic and sync time. Only fields that currently contain data are selectable.
      </Text>

      <div className={styles.actions}>
        <Button appearance="secondary" icon={<AddRegular />} onClick={() => addRule()}>Add filter</Button>
        <Button appearance="secondary" icon={<ArrowResetRegular />} onClick={resetRules}>Reset filters</Button>
        <Dropdown
          placeholder="Apply template"
          onOptionSelect={(_, data) => {
            const template = templates.find((t) => t.id === data.optionValue);
            if (template) applyRules(template.rules);
          }}
        >
          {templates.map((template) => (
            <Option key={template.id} value={template.id} text={template.label}>{template.label}</Option>
          ))}
        </Dropdown>
        <Button appearance="secondary" onClick={onSyncNow}>Sync now</Button>
        <Button
          appearance="secondary"
          icon={<NumberSymbolRegular />}
          onClick={() => countRows()}
          disabled={countLoading}
        >
          {countLoading ? 'Counting...' : 'Count rows'}
        </Button>
        {queryCount !== null ? (
          <Badge appearance="tint" color="brand">
            Query rows in D365: {queryCount.toLocaleString('nl-NL')}
          </Badge>
        ) : null}
      </div>

      {rules.map((rule, index) => (
        <RuleRow
          key={index}
          rule={{
            ...rule,
            availableFieldCount: fieldsForLevel(rule.level || 'header').length,
          }}
          index={index}
          onUpdate={updateRule}
          onRemove={removeRule}
          onOpenPicker={openPicker}
        />
      ))}

      {preview ? <div className={styles.preview}>$filter = {preview}</div> : null}

      <div className={styles.actions}>
        <Button appearance="primary" icon={<SaveRegular />} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save filters'}
        </Button>
        {error ? <Text className={styles.error}>{error}</Text> : null}
        {countError ? <Text className={styles.error}>{countError}</Text> : null}
        {savedAt ? <Text className={styles.saved}>Saved. Next sync uses these filters.</Text> : null}
      </div>

      <FilterFieldPickerDialog
        open={pickerState.open}
        level={pickerLevel}
        fields={pickerFields}
        onClose={closePicker}
        onSelect={handlePickField}
      />
    </div>
  );
}

export default memo(SyncFilterBuilder);
