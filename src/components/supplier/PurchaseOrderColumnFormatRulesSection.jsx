import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../shared/ColorPalettePicker';
import { FORMAT_RULE_OPERATORS } from './columnFormatRuleUtils';

const RULE_TARGET_LABELS = { cell: 'Cell', row: 'Row' };
const RULE_OPERATOR_LABELS = { '=': '=', '<>': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };

const useStyles = makeStyles({
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  helperText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  rulesDialogSurface: {
    width: 'min(94vw, 760px)',
    maxWidth: '760px',
  },
  rulesDialogBody: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    maxHeight: '70vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  ruleList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  ruleRow: {
    display: 'grid',
    gridTemplateColumns: '80px 120px minmax(150px, 220px) 40px 76px',
    ...shorthands.gap('6px'),
    alignItems: 'center',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
      ...shorthands.padding('8px'),
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
      borderRadius: tokens.borderRadiusMedium,
    },
  },
  compactControl: {
    width: '100%',
    maxWidth: '220px',
  },
  emptyState: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  addRuleButton: {
    width: 'fit-content',
    minWidth: '92px',
    height: '26px',
    ...shorthands.padding('0', '10px'),
    fontSize: tokens.fontSizeBase200,
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
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);

  const targetLabel = useMemo(() => RULE_TARGET_LABELS[formatTarget] || 'Cell', [formatTarget]);
  const summaryText = useMemo(() => {
    const count = Array.isArray(formatRules) ? formatRules.length : 0;
    return count > 0
      ? `${count} rule(s) configured - target: ${targetLabel.toLowerCase()}`
      : 'No rules configured yet.';
  }, [formatRules, targetLabel]);

  const openRulesDialog = useCallback(() => setIsRulesDialogOpen(true), []);
  const closeRulesDialog = useCallback(() => setIsRulesDialogOpen(false), []);

  const handleDialogOpenChange = useCallback((_, data) => {
    setIsRulesDialogOpen(Boolean(data.open));
  }, []);

  const handleTargetChange = useCallback((_, data) => {
    if (!data.optionValue) return;
    setFormatTarget(data.optionValue);
  }, [setFormatTarget]);

  return (
    <div className={styles.pickerWrap}>
      <Text weight="semibold">Conditional formatting</Text>
      <Text className={styles.helperText}>{summaryText}</Text>
      <Button size="small" appearance="secondary" onClick={openRulesDialog}>
        Manage formatting rules
      </Button>

      <Dialog open={isRulesDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogSurface className={styles.rulesDialogSurface}>
          <DialogBody>
            <DialogTitle>Conditional formatting</DialogTitle>
            <DialogContent className={styles.rulesDialogBody}>
              <Field label="Target">
                <Dropdown
                  value={RULE_TARGET_LABELS[formatTarget]}
                  selectedOptions={[formatTarget]}
                  onOptionSelect={handleTargetChange}
                >
                  <Option value="cell">Cell</Option>
                  <Option value="row">Row</Option>
                </Dropdown>
              </Field>

              <div className={styles.ruleList}>
                {!formatRules.length ? (
                  <Text className={styles.emptyState}>No rules yet. Add rule to start.</Text>
                ) : null}
                {formatRules.map((rule) => (
                  <div key={rule.id} className={styles.ruleRow}>
                    <Dropdown
                      className={styles.compactControl}
                      value={RULE_OPERATOR_LABELS[rule.op]}
                      selectedOptions={[rule.op]}
                      onOptionSelect={(_, data) => updateFormatRule(rule.id, { op: data.optionValue })}
                    >
                      {FORMAT_RULE_OPERATORS.map((operator) => (
                        <Option key={operator} value={operator}>{RULE_OPERATOR_LABELS[operator]}</Option>
                      ))}
                    </Dropdown>
                    <Dropdown
                      className={styles.compactControl}
                      value={rule.compareMode === 'column' ? 'Column' : 'Value'}
                      selectedOptions={[rule.compareMode]}
                      onOptionSelect={(_, data) => updateFormatRule(rule.id, { compareMode: data.optionValue })}
                    >
                      <Option value="value">Value</Option>
                      <Option value="column">Column</Option>
                    </Dropdown>
                    {rule.compareMode === 'column' ? (
                      <Dropdown
                        className={styles.compactControl}
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
                        className={styles.compactControl}
                        value={rule.value}
                        onChange={(_, data) => updateFormatRule(rule.id, { value: data.value })}
                        placeholder="Compare value"
                      />
                    )}
                    <ColorPalettePicker
                      layout="compact"
                      selectedColor={rule.color}
                      onSelect={(color) => updateFormatRule(rule.id, { color })}
                      ariaLabel="Rule color"
                    />
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      onClick={() => removeFormatRule(rule.id)}
                      aria-label="Delete rule"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                className={styles.addRuleButton}
                size="small"
                appearance="primary"
                onClick={addFormatRule}
              >
                + Add rule
              </Button>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={closeRulesDialog}>
                Done
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
