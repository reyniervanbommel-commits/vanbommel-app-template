import React from 'react';
import { Button, Dropdown, Field, Input, Option, Text, makeStyles, shorthands } from '@fluentui/react-components';
import { FORMAT_RULE_COLOR_PALETTE, FORMAT_RULE_OPERATORS } from './columnFormatRuleUtils';

const RULE_TARGET_LABELS = { cell: 'Cell', row: 'Row' };
const RULE_OPERATOR_LABELS = { '=': '=', '<>': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };

const useStyles = makeStyles({
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  ruleRow: {
    display: 'grid',
    gridTemplateColumns: '90px 90px 1fr 80px 28px',
    ...shorthands.gap('6px'),
    alignItems: 'center',
  },
  colorSwatch: {
    width: '100%',
    minWidth: '28px',
    ...shorthands.padding('0'),
  },
});

export default function PurchaseOrderColumnFormatRulesSection({
  formatTarget,
  setFormatTarget,
  formatRules,
  referenceColumns,
  addFormatRule,
  updateFormatRule,
  removeFormatRule,
}) {
  const styles = useStyles();

  return (
    <div className={styles.pickerWrap}>
      <Text weight="semibold">Conditional formatting</Text>
      <Field label="Target">
        <Dropdown
          value={RULE_TARGET_LABELS[formatTarget]}
          selectedOptions={[formatTarget]}
          onOptionSelect={(_, data) => setFormatTarget(data.optionValue)}
        >
          <Option value="cell">Cell</Option>
          <Option value="row">Row</Option>
        </Dropdown>
      </Field>
      {formatRules.map((rule) => (
        <div key={rule.id} className={styles.ruleRow}>
          <Dropdown
            value={RULE_OPERATOR_LABELS[rule.op]}
            selectedOptions={[rule.op]}
            onOptionSelect={(_, data) => updateFormatRule(rule.id, { op: data.optionValue })}
          >
            {FORMAT_RULE_OPERATORS.map((operator) => (
              <Option key={operator} value={operator}>{RULE_OPERATOR_LABELS[operator]}</Option>
            ))}
          </Dropdown>
          <Dropdown
            value={rule.compareMode === 'column' ? 'Column' : 'Value'}
            selectedOptions={[rule.compareMode]}
            onOptionSelect={(_, data) => updateFormatRule(rule.id, { compareMode: data.optionValue })}
          >
            <Option value="value">Value</Option>
            <Option value="column">Column</Option>
          </Dropdown>
          {rule.compareMode === 'column' ? (
            <Dropdown
              value={rule.valueRef || 'Select column'}
              selectedOptions={rule.valueRef ? [rule.valueRef] : []}
              onOptionSelect={(_, data) => updateFormatRule(rule.id, { valueRef: data.optionValue })}
            >
              {referenceColumns.map((refColumn) => (
                <Option key={refColumn.key} value={refColumn.key}>{refColumn.label}</Option>
              ))}
            </Dropdown>
          ) : (
            <Input
              value={rule.value}
              onChange={(_, data) => updateFormatRule(rule.id, { value: data.value })}
              placeholder="Compare value"
            />
          )}
          <Dropdown
            value={rule.color}
            selectedOptions={[rule.color]}
            onOptionSelect={(_, data) => updateFormatRule(rule.id, { color: data.optionValue })}
          >
            {FORMAT_RULE_COLOR_PALETTE.map((color) => (
              <Option key={color} value={color}>
                <span className={styles.colorSwatch} style={{ backgroundColor: color }}>{color}</span>
              </Option>
            ))}
          </Dropdown>
          <Button size="small" appearance="subtle" onClick={() => removeFormatRule(rule.id)} aria-label="Remove rule">
            x
          </Button>
        </div>
      ))}
      <Button size="small" appearance="secondary" onClick={addFormatRule}>
        + Add rule
      </Button>
    </div>
  );
}
