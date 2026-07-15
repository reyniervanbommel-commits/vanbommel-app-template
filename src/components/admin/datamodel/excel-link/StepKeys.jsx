import React from 'react';
import {
  Dropdown,
  Field,
  Option,
  Radio,
  RadioGroup,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px'), maxWidth: '560px' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  warn: { color: tokens.colorPaletteDarkOrangeForeground1, fontSize: tokens.fontSizeBase200 },
});

/**
 * Stap 2: sleutels koppelen. Kies hoofdtabel, scope (master/detail),
 * hoofdtabel-sleutelveld (uit scope-kolommen) en dataset-sleutelveld.
 */
export default function StepKeys({
  mainTables,
  dataset,
  selectedMainTable,
  scopeColumns,
  mainTableKey,
  onMainTableKey,
  sourceScope,
  onSourceScope,
  mainKeyField,
  onMainKeyField,
  datasetKeyField,
  onDatasetKeyField,
}) {
  const styles = useStyles();

  const mainTableLabel = selectedMainTable?.label || '';
  const mainKeyLabel = scopeColumns.find((c) => c.key === mainKeyField)?.label || '';
  const datasetColumns = dataset?.columns || [];
  const datasetKeyLabel = datasetColumns.find((c) => c.key === datasetKeyField)?.label || '';
  const hasDetail = (selectedMainTable?.columns?.detail || []).length > 0;

  return (
    <div className={styles.root}>
      <Field label="Main table">
        <Dropdown
          placeholder="Choose a main table"
          value={mainTableLabel}
          selectedOptions={mainTableKey ? [mainTableKey] : []}
          onOptionSelect={(_, d) => onMainTableKey(d.optionValue)}
        >
          {mainTables.map((t) => (
            <Option key={t.tableKey} value={t.tableKey} text={t.label}>{t.label}</Option>
          ))}
        </Dropdown>
      </Field>

      <Field label="Scope">
        <RadioGroup
          layout="horizontal"
          value={sourceScope}
          onChange={(_, d) => onSourceScope(d.value)}
        >
          <Radio value="master" label="Header row (master)" />
          <Radio value="detail" label="Detail row (detail)" disabled={Boolean(selectedMainTable) && !hasDetail} />
        </RadioGroup>
        <Text className={styles.hint} block>
          Determines at which level of the main table enrichment columns are linked.
        </Text>
      </Field>

      <Field label="Keyveld hoofdtabel">
        <Dropdown
          placeholder={selectedMainTable ? 'Choose a key field' : 'Choose a main table first'}
          disabled={!selectedMainTable}
          value={mainKeyLabel}
          selectedOptions={mainKeyField ? [mainKeyField] : []}
          onOptionSelect={(_, d) => onMainKeyField(d.optionValue)}
        >
          {scopeColumns.map((c) => (
            <Option key={c.key} value={c.key} text={c.label}>{c.label}</Option>
          ))}
        </Dropdown>
      </Field>

      <Field label="Keyveld dataset">
        <Dropdown
          placeholder={dataset ? 'Choose a key field' : 'Upload a file first'}
          disabled={!dataset}
          value={datasetKeyLabel}
          selectedOptions={datasetKeyField ? [datasetKeyField] : []}
          onOptionSelect={(_, d) => onDatasetKeyField(d.optionValue)}
        >
          {datasetColumns.map((c) => (
            <Option key={c.key} value={c.key} text={c.label}>{c.label}</Option>
          ))}
        </Dropdown>
        <Text className={styles.hint} block>
          Values in this dataset field are matched against the selected key field of the main table.
        </Text>
      </Field>
    </div>
  );
}
