import React, { memo } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  Input,
  Option,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { ENUM_FIELDS } from '../../../hooks/useSyncFilters';
import { OPERATOR_LABELS } from './FilterFieldPickerDialog';

function operatorsForType(valueType) {
  if (valueType === 'text') return ['eq', 'ne', 'contains', 'notcontains', 'startswith', 'notstartswith', 'oneof'];
  if (valueType === 'enum') return ['eq', 'ne', 'oneof'];
  if (valueType === 'date') return ['eq', 'ne', 'lt', 'gt'];
  return ['eq', 'ne', 'oneof'];
}

function SyncFilterRuleRow({ rule, index, onUpdate, onRemove, onOpenPicker, styles }) {
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
        size="small"
        selectedOptions={[rule.level || 'header']}
        value={rule.level === 'line' ? 'Subitems (Lines)' : 'Main items (Headers)'}
        onOptionSelect={(_, data) => onUpdate(index, { level: data.optionValue, field: '', value: '', valueType: 'text', operator: 'eq' })}
      >
        <Option value="header" text="Main items (Headers)">Main items (Headers)</Option>
        <Option value="line" text="Subitems (Lines)">Subitems (Lines)</Option>
      </Dropdown>

      <Button
        size="small"
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
        size="small"
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
          size="small"
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
          size="small"
          type={rule.valueType === 'number' ? 'number' : rule.valueType === 'date' ? 'date' : 'text'}
          placeholder={selectedOperator === 'oneof' ? 'Value1, Value2, Value3' : 'Value'}
          value={String(rule.value ?? '')}
          onChange={(e) => onUpdate(index, { value: e.target.value })}
        />
      )}

      <Button size="small" appearance="subtle" icon={<DeleteRegular />} onClick={() => onRemove(index)} />
    </div>
  );
}

export default memo(SyncFilterRuleRow);
