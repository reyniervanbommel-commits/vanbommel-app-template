import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Option,
  Dropdown,
  Text,
  Textarea,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import PurchaseOrderFormulaFormatRulesSection from './PurchaseOrderFormulaFormatRulesSection';
import {
  FORMAT_RULE_COLOR_PALETTE,
  FORMAT_RULE_OPERATORS,
  normalizeColumnFormatRuleSet,
} from './columnFormatRuleUtils';

const FORMULA_RESULT_TYPES = [
  { value: 'number', label: 'Getal' },
  { value: 'text', label: 'Tekst' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja/nee' },
];

const DATA_TYPE_LABELS = Object.fromEntries(FORMULA_RESULT_TYPES.map((type) => [type.value, type.label]));
const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('14px'),
  },
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  refButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
    maxHeight: '168px',
    overflowY: 'auto',
    ...shorthands.padding('4px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
  },
  helperText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export default function PurchaseOrderFormulaColumnDialog({
  open,
  onOpenChange,
  onSubmit,
  sourceColumn,
  availableColumns = [],
  initialValue = null,
  initialFormatRuleSet = null,
}) {
  const styles = useStyles();
  const [label, setLabel] = useState('');
  const [resultType, setResultType] = useState('number');
  const [formulaExpr, setFormulaExpr] = useState('');
  const [formatTarget, setFormatTarget] = useState('cell');
  const [formatRules, setFormatRules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLabel(String(initialValue?.label || '').trim() || 'Nieuwe formule');
    setResultType(initialValue?.dataType || 'number');
    setFormulaExpr(initialValue?.formulaExpr || '');
    const initialRules = Array.isArray(initialFormatRuleSet?.rules) ? initialFormatRuleSet.rules : [];
    setFormatTarget(initialFormatRuleSet?.target === 'row' ? 'row' : 'cell');
    setFormatRules(initialRules.map((rule, index) => ({
      id: `rule-${index}`,
      op: FORMAT_RULE_OPERATORS.includes(rule?.op) ? rule.op : '=',
      compareMode: rule?.valueRef ? 'column' : 'value',
      value: rule?.value === undefined || rule?.value === null ? '' : String(rule.value),
      valueRef: String(rule?.valueRef || ''),
      color: String(rule?.color || FORMAT_RULE_COLOR_PALETTE[0]).toLowerCase(),
    })));
    setSaving(false);
    setError('');
  }, [open, initialValue, initialFormatRuleSet]);

  const dialogTitle = initialValue ? 'Formulekolom bewerken' : 'Formulekolom toevoegen';
  const sourceLabel = String(sourceColumn?.label || '').trim();
  const sourceKey = String(sourceColumn?.key || '').trim();

  const referenceColumns = useMemo(() => (
    (Array.isArray(availableColumns) ? availableColumns : []).filter((column) => {
      if (!column || typeof column !== 'object') return false;
      const key = String(column.key || '').trim();
      if (!key) return false;
      return !String(column.formulaExpr || '').trim();
    })
  ), [availableColumns]);

  const insertReference = useCallback((columnKey) => {
    const ref = `(${columnKey})`;
    setFormulaExpr((prev) => `${String(prev || '')}${ref}`);
  }, []);
  const addFormatRule = useCallback(() => {
    setFormatRules((prev) => [...prev, {
      id: `rule-${Date.now()}-${prev.length}`,
      op: '=',
      compareMode: 'value',
      value: '',
      valueRef: '',
      color: FORMAT_RULE_COLOR_PALETTE[0],
    }]);
  }, []);
  const removeFormatRule = useCallback((ruleId) => {
    setFormatRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  }, []);
  const updateFormatRule = useCallback((ruleId, patch) => {
    setFormatRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)));
  }, []);

  const handleSubmit = useCallback(async () => {
    const cleanLabel = String(label || '').trim();
    const cleanFormula = String(formulaExpr || '').trim();
    if (!cleanLabel) {
      setError('Geef een naam op voor de formulekolom.');
      return;
    }
    if (!cleanFormula) {
      setError('Geef een formule op.');
      return;
    }
    const normalizedFormatRuleSet = normalizeColumnFormatRuleSet({
      target: formatTarget,
      rules: formatRules.map((rule) => ({
        op: rule.op,
        color: rule.color,
        ...(rule.compareMode === 'column' ? { valueRef: rule.valueRef } : { value: rule.value }),
      })),
    });
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        label: cleanLabel,
        dataType: resultType,
        formulaExpr: cleanFormula,
        formatRuleSet: normalizedFormatRuleSet,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Formule opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }, [label, formulaExpr, formatRules, formatTarget, onOpenChange, onSubmit, resultType]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Text className={styles.helperText}>
                Nieuwe kolom komt rechts van: {sourceLabel || '-'} {sourceKey ? `(${sourceKey})` : ''}
              </Text>

              <Field label="Naam" required>
                <Input
                  value={label}
                  onChange={(_, data) => setLabel(data.value)}
                  placeholder="Bijv. Verschil budget"
                />
              </Field>

              <Field label="Resultaattype" required>
                <Dropdown
                  value={DATA_TYPE_LABELS[resultType]}
                  selectedOptions={[resultType]}
                  onOptionSelect={(_, data) => setResultType(data.optionValue)}
                >
                  {FORMULA_RESULT_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field label="Formule" required hint="Voorbeeld: ALS((a)>(b);'Fout';(a)+(b))">
                <Textarea
                  value={formulaExpr}
                  onChange={(_, data) => setFormulaExpr(data.value)}
                  resize="vertical"
                  rows={4}
                />
              </Field>

              <div className={styles.pickerWrap}>
                <Text weight="semibold">Kolomreferenties</Text>
                <div className={styles.refButtons}>
                  {referenceColumns.map((column) => (
                    <Button
                      key={column.key}
                      size="small"
                      appearance="secondary"
                      onClick={() => insertReference(column.key)}
                    >
                      {column.label}
                    </Button>
                  ))}
                </div>
              </div>

              <PurchaseOrderFormulaFormatRulesSection
                formatTarget={formatTarget}
                setFormatTarget={setFormatTarget}
                formatRules={formatRules}
                referenceColumns={referenceColumns}
                addFormatRule={addFormatRule}
                updateFormatRule={updateFormatRule}
                removeFormatRule={removeFormatRule}
              />

              {error ? (
                <Field validationState="error" validationMessage={error} />
              ) : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
