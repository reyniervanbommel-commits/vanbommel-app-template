import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, SaveRegular, FilterRegular, ArrowResetRegular, NumberSymbolRegular } from '@fluentui/react-icons';
import { useSyncFilters, ENUM_FIELDS } from '../../../hooks/useSyncFilters';
import FilterFieldPickerDialog from './FilterFieldPickerDialog';
import SyncFilterRuleRow from './SyncFilterRuleRow';
import AdminInfoHint from './AdminInfoHint';
import { DATA_MODEL_INFO } from './dataModelInfoCopy';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('14px', '16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  titleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
    ...shorthands.padding('4px', '0'),
  },
  levelDropdown: { width: '170px', minWidth: '170px' },
  operatorDropdown: { width: '170px', minWidth: '170px' },
  valueInput: { width: '240px', minWidth: '180px', maxWidth: '320px', flex: '0 1 240px' },
  preview: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding('8px', '12px'),
    ...shorthands.borderRadius('6px'),
    wordBreak: 'break-all',
  },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: tokens.fontSizeBase200 },
  saved: { color: tokens.colorPaletteGreenForeground1, fontSize: tokens.fontSizeBase200 },
  fieldBadge: { minWidth: '220px', maxWidth: '420px', flex: '1 1 260px' },
  templateDropdown: { width: '200px', minWidth: '180px' },
});

// Nulmeting-knop: haalt alles opnieuw op zonder het als wijzigingen te loggen. Los van "Sync now"
// omdat het de wijzigingshistorie bewust overslaat — bedoeld na een datamodel-wijziging.
function ReimportBaselineButton({ onReimportBaseline, busy }) {
  if (!onReimportBaseline) return null;
  return (
    <>
      <Button
        size="small"
        appearance="secondary"
        onClick={onReimportBaseline}
        disabled={busy}
      >
        {busy ? 'Re-importing...' : 'Re-import (baseline)'}
      </Button>
      <AdminInfoHint text={DATA_MODEL_INFO.reimportBaseline} label="About re-import baseline" />
    </>
  );
}

function SyncFilterBuilder({ tableKey = 'purchase-orders', filterCatalog, syncFilter, cache, onReimportBaseline, baselineBusy = false }) {
  const styles = useStyles();
  const [pickerState, setPickerState] = useState({ open: false, index: null, level: null });
  // Read-only leunt op de server (syncFilter.readOnly). vendors/product-receipt-lines blijven
  // altijd inherited; items is bewerkbaar maar blijft binnen de PO lookup scope.
  const isReadOnly = Boolean(syncFilter?.readOnly)
    || tableKey === 'vendors' || tableKey === 'product-receipt-lines';
  const readOnlyMessage = String(syncFilter?.message || '').trim();
  const inheritedCompiled = String(syncFilter?.inheritedCompiled || '').trim();
  const poScopeHint = String(syncFilter?.poScopeHint || '').trim();
  // Master-only tabellen (bv. items op ReleasedProductsV2) hebben geen regel-niveau.
  const hasLineLevel = (filterCatalog?.line?.length || 0) > 0;
  const {
    rules, preview, addRule, updateRule, removeRule, applyRules, resetRules, countRows,
    save, saving, error, savedAt, queryCount, countLoading, countError,
  } = useSyncFilters(syncFilter?.rules, tableKey);

  const templates = syncFilter?.templates || [];
  const activeRules = useMemo(() => rules.filter((r) => r.field && r.value !== '' && r.value !== null && r.value !== undefined), [rules]);
  const retainedRows = Number(cache?.retainedRows) || 0;
  const retainedMaxAuto = Number(cache?.retainedMaxAuto) || 2000;
  const retentionHint = useMemo(() => {
    if (tableKey !== 'purchase-orders' || retainedRows <= 0) return '';
    const warning = String(cache?.retentionWarning || 'none');
    if (warning === 'cap' || warning === 'critical') {
      return `${retainedRows} orders are retained outside the current sync filter (limit ${retainedMaxAuto.toLocaleString('en-US')} reached — review filter or hidden rows).`;
    }
    if (warning === 'approaching') {
      return `${retainedRows} orders are retained outside the current sync filter and will be refreshed individually.`;
    }
    return `${retainedRows} orders are retained outside the current sync filter and will be refreshed individually.`;
  }, [cache?.retentionWarning, retainedMaxAuto, retainedRows, tableKey]);

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
      // enumType komt uit de centrale registry per veld (niet hardcoded), zodat bv. ProductType
      // de EcoResProductType-namespace krijgt en niet abusievelijk PurchStatus.
      enumType: field.valueType === 'enum' ? ENUM_FIELDS[field.field]?.enumType : undefined,
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
          <AdminInfoHint text={DATA_MODEL_INFO.syncFilters} label="About D365 sync filters" />
          <Badge appearance="tint" color="informative" size="small">Inherited</Badge>
        </div>
        <Text className={styles.hint} block>
          {readOnlyMessage || 'This table inherits the active Purchase Orders sync filter and cannot be edited separately.'}
        </Text>
        {inheritedCompiled ? <div className={styles.preview}>Inherited $filter = {inheritedCompiled}</div> : null}
        <div className={styles.actions}>
          <ReimportBaselineButton onReimportBaseline={onReimportBaseline} busy={baselineBusy} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <FilterRegular />
        <Text weight="semibold" size={400}>D365 sync filters</Text>
        <AdminInfoHint text={DATA_MODEL_INFO.syncFilters} label="About D365 sync filters" />
        <Badge appearance="tint" color={activeRules.length ? 'brand' : 'warning'} size="small">
          {activeRules.length ? `${activeRules.length} active` : 'No active filter'}
        </Badge>
      </div>
      <Text className={styles.hint} block>
        Filters are applied directly in the D365 OData call (headers + subitems). This reduces D365 load,
        network traffic and sync time. Use Discover D365 fields to register all entity columns first.
      </Text>
      {poScopeHint ? (
        <Text className={styles.hint} block>{poScopeHint}</Text>
      ) : null}
      {poScopeHint && inheritedCompiled ? (
        <div className={styles.preview}>Purchase Orders $filter (scope) = {inheritedCompiled}</div>
      ) : null}
      {tableKey === 'purchase-orders' ? (
        <div className={styles.titleRow}>
          <Text className={styles.hint}>
            {retentionHint || `Orders that leave this filter stay on the board and are refreshed individually (up to ${retainedMaxAuto.toLocaleString('en-US')}). Change the cap on the OData tab.`}
          </Text>
          <AdminInfoHint text={DATA_MODEL_INFO.retention} label="About retained orders" />
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button size="small" appearance="secondary" icon={<AddRegular />} onClick={() => addRule()}>Add filter</Button>
        <Button size="small" appearance="secondary" icon={<ArrowResetRegular />} onClick={resetRules}>Reset filters</Button>
        <Dropdown
          className={styles.templateDropdown}
          size="small"
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
        <ReimportBaselineButton onReimportBaseline={onReimportBaseline} busy={baselineBusy} />
        <Button
          size="small"
          appearance="secondary"
          icon={<NumberSymbolRegular />}
          onClick={() => countRows()}
          disabled={countLoading}
        >
          {countLoading ? 'Counting...' : 'Count rows'}
        </Button>
        <AdminInfoHint text={DATA_MODEL_INFO.countRows} label="About count rows" />
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
          hasLineLevel={hasLineLevel}
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
        <AdminInfoHint text={DATA_MODEL_INFO.saveFilters} label="About save filters" />
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
