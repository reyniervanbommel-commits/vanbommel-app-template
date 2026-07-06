import React from 'react';
import { Button, Dropdown, Field, Input, Option, Text, makeStyles, shorthands } from '@fluentui/react-components';
import { FORMAT_RULE_COLOR_PALETTE, FORMAT_RULE_OPERATORS } from './columnFormatRuleUtils';

const RULE_TARGET_LABELS = { cell: 'Cel', row: 'Rij' };
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

export default function PurchaseOrderFormulaFormatRulesSection({
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
      <Text weight="semibold">Voorwaardelijke opmaak (optioneel)</Text>
      <Field label="Doel">
        <Dropdown
          value={RULE_TARGET_LABELS[formatTarget]}
          selectedOptions={[formatTarget]}
          onOptionSelect={(_, data) => setFormatTarget(data.optionValue)}
        >
          <Option value="cell">Cel</Option>
          <Option value="row">Rij</Option>
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
            value={rule.compareMode === 'column' ? 'Kolom' : 'Waarde'}
            selectedOptions={[rule.compareMode]}
            onOptionSelect={(_, data) => updateFormatRule(rule.id, { compareMode: data.optionValue })}
          >
            <Option value="value">Waarde</Option>
            <Option value="column">Kolom</Option>
          </Dropdown>
          {rule.compareMode === 'column' ? (
            <Dropdown
              value={rule.valueRef || 'Kies kolom'}
              selectedOptions={rule.valueRef ? [rule.valueRef] : []}
              onOptionSelect={(_, data) => updateFormatRule(rule.id, { valueRef: data.optionValue })}
            >
              {referenceColumns.map((column) => (
                <Option key={column.key} value={column.key}>{column.label}</Option>
              ))}
            </Dropdown>
          ) : (
            <Input
              value={rule.value}
              onChange={(_, data) => updateFormatRule(rule.id, { value: data.value })}
              placeholder="Vergelijkwaarde"
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
          <Button size="small" appearance="subtle" onClick={() => removeFormatRule(rule.id)}>
            x
          </Button>
        </div>
      ))}
      <Button size="small" appearance="secondary" onClick={addFormatRule}>
        + Regel toevoegen
      </Button>
    </div>
  );
}
