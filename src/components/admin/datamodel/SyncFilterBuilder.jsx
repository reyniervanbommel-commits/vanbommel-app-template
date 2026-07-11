import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, SaveRegular, FilterRegular, ArrowResetRegular, NumberSymbolRegular } from '@fluentui/react-icons';
import { useSyncFilters } from '../../../hooks/useSyncFilters';
import FilterFieldPickerDialog from './FilterFieldPickerDialog';
import SyncFilterRuleRow from './SyncFilterRuleRow';

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

function SyncFilterBuilder({ tableKey = 'purchase-orders', filterCatalog, syncFilter, cache, onSyncNow }) {
  const styles = useStyles();
  const [pickerState, setPickerState] = useState({ open: false, index: null, level: null });
  const isInheritedTable = tableKey === 'vendors' || tableKey === 'items';
  const isReadOnly = isInheritedTable || Boolean(syncFilter?.readOnly);
  const readOnlyMessage = String(syncFilter?.message || '').trim();
  const inheritedCompiled = String(
    syncFilter?.inheritedCompiled
    || (isInheritedTable ? syncFilter?.compiled : '')
    || ''
  ).trim();
  const {
    rules, preview, addRule, updateRule, removeRule, applyRules, resetRules, countRows,
    save, saving, error, savedAt, queryCount, countLoading, countError,
  } = useSyncFilters(syncFilter?.rules, tableKey);

  const templates = syncFilter?.templates || [];
  const activeRules = useMemo(() => rules.filter((r) => r.field && r.value !== '' && r.value !== null && r.value !== undefined), [rules]);
  const retainedRows = Number(cache?.retainedRows) || 0;
  const retentionHint = useMemo(() => {
    if (tableKey !== 'purchase-orders' || retainedRows <= 0) return '';
    const warning = String(cache?.retentionWarning || 'none');
    if (warning === 'cap' || warning === 'critical') {
      return `${retainedRows} orders are retained outside the current sync filter (limit reached — review filter or hidden rows).`;
    }
    if (warning === 'approaching') {
      return `${retainedRows} orders are retained outside the current sync filter and will be refreshed individually.`;
    }
    return `${retainedRows} orders are retained outside the current sync filter and will be refreshed individually.`;
  }, [cache?.retentionWarning, retainedRows, tableKey]);

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
          {readOnlyMessage || 'This table inherits the active Purchase Orders sync filter and cannot be edited separately.'}
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
      {retentionHint ? (
        <Text className={styles.hint} block>
          {retentionHint}
        </Text>
      ) : null}

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
        <SyncFilterRuleRow
          key={index}
          rule={{
            ...rule,
            availableFieldCount: fieldsForLevel(rule.level || 'header').length,
          }}
          index={index}
          onUpdate={updateRule}
          onRemove={removeRule}
          onOpenPicker={openPicker}
          styles={styles}
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
