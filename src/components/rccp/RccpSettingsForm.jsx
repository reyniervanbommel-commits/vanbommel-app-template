import React, { memo } from 'react';
import {
  Button, Field, Input, Select, Switch, Spinner, Text, makeStyles, tokens, shorthands, mergeClasses,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import RccpQuantityMeasuresEditor from './RccpQuantityMeasuresEditor';
import RccpChartWeekRangesEditor from './RccpChartWeekRangesEditor';
import RccpDeliveryPlanFields from './RccpDeliveryPlanFields';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalXL) },
  rootFlyout: { ...shorthands.gap(tokens.spacingVerticalL) },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    ...shorthands.padding(tokens.spacingVerticalXL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  sectionFlyout: {
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.gap(tokens.spacingVerticalM),
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', ...shorthands.gap(tokens.spacingHorizontalM) },
  gridFlyout: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalMNudge), alignItems: 'flex-start' },
  fieldFlyout: { width: 'auto', maxWidth: '100%' },
  // Eén breedte voor alle controls in de flyout. Zet de breedte op de control zelf:
  // een wrapper met maxWidth + overflowX gaf number-inputs een echte scrollbalk.
  compactControl: { width: '168px', maxWidth: '100%' },
  hint: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap(tokens.spacingHorizontalM), flexWrap: 'wrap' },
});

function ColumnSelect({ label, value, onChange, columns, hint, compact }) {
  const styles = useStyles();
  return (
    <Field label={label} hint={hint} className={compact ? styles.fieldFlyout : undefined}>
      <Select
        className={compact ? styles.compactControl : undefined}
        size={compact ? 'small' : 'medium'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {columns.map((col) => (
          <option key={`${col.scope}-${col.key}`} value={col.key}>{col.label || col.key}</option>
        ))}
      </Select>
    </Field>
  );
}

function RccpSettingsForm({
  variant = 'page', config, columns, saving, error, saved, statusOptions, onUpdateField, onSave,
}) {
  const styles = useStyles();
  const isFlyout = variant === 'flyout';

  if (!config) {
    return <Text className={styles.hint}>{error || 'No settings available'}</Text>;
  }

  // Val terug op "None" als de opgeslagen open-measure inmiddels uit de measures is verwijderd,
  // zodat de Select niet stilzwijgend de eerste optie toont.
  const openMeasureValue = (config.quantityMeasures || []).some((m) => m.columnKey === config.openMeasureKey)
    ? config.openMeasureKey
    : '';

  const actions = (
    <div className={styles.actions}>
      <Button appearance="primary" icon={<Save24Regular />} onClick={onSave} disabled={saving}>Save settings</Button>
      {saving && <Spinner size="tiny" />}
      {saved && <Text className={styles.hint}>Saved</Text>}
      {error && <Text className={styles.error}>{error}</Text>}
    </div>
  );

  return (
    <div className={mergeClasses(styles.root, isFlyout && styles.rootFlyout)}>
      {!isFlyout && (
        <>
          <Text size={600} weight="semibold">RCCP settings</Text>
          <Text className={styles.hint}>Configure main-table columns for RCCP load and chart series.</Text>
        </>
      )}

      <div className={mergeClasses(styles.section, isFlyout && styles.sectionFlyout)}>
        <div className={mergeClasses(styles.grid, isFlyout && styles.gridFlyout)}>
          <ColumnSelect
            compact={isFlyout}
            label="Vendor column"
            value={config.vendorColumnKey}
            onChange={(v) => onUpdateField('vendorColumnKey', v)}
            columns={columns.filter((c) => c.scope === 'master')}
          />
          <ColumnSelect
            compact={isFlyout}
            label="Date column"
            hint="Line date falls back to order header when empty."
            value={config.dateColumnKey}
            onChange={(v) => onUpdateField('dateColumnKey', v)}
            columns={columns}
          />
        </div>
      </div>

      <RccpDeliveryPlanFields
        config={config}
        columns={columns}
        compact={isFlyout}
        onUpdateField={onUpdateField}
      />

      <div className={mergeClasses(styles.section, isFlyout && styles.sectionFlyout)}>
        <RccpQuantityMeasuresEditor
          measures={config.quantityMeasures || []}
          columns={columns}
          compact={isFlyout}
          onChange={(quantityMeasures) => onUpdateField('quantityMeasures', quantityMeasures)}
        />
        <Field
          label="Open measure (subtract from capacity)"
          hint="Adds an 'Overcapacity' row: capacity minus this measure. Negative = capacity shortage."
          className={isFlyout ? styles.fieldFlyout : undefined}
        >
          <Select
            className={isFlyout ? styles.compactControl : undefined}
            size={isFlyout ? 'small' : 'medium'}
            value={openMeasureValue}
            onChange={(e) => onUpdateField('openMeasureKey', e.target.value)}
          >
            <option value="">None</option>
            {(config.quantityMeasures || []).map((m) => (
              <option key={m.columnKey} value={m.columnKey}>{m.label || m.columnKey}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Delivered measure (below x-axis)"
          hint="Bars for this measure are mirrored below the baseline to visualise delivered quantity."
          className={isFlyout ? styles.fieldFlyout : undefined}
        >
          <Select
            className={isFlyout ? styles.compactControl : undefined}
            size={isFlyout ? 'small' : 'medium'}
            value={config.deliveredMeasureKey ?? ''}
            onChange={(e) => onUpdateField('deliveredMeasureKey', e.target.value)}
          >
            <option value="">None</option>
            {(config.quantityMeasures || []).map((m) => (
              <option key={m.columnKey} value={m.columnKey}>{m.label || m.columnKey}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Remaining measure"
          hint="Shows remaining open orders as a positive bar (above x-axis)."
          className={isFlyout ? styles.fieldFlyout : undefined}
        >
          <Select
            className={isFlyout ? styles.compactControl : undefined}
            size={isFlyout ? 'small' : 'medium'}
            value={config.remainingMeasureKey ?? ''}
            onChange={(e) => onUpdateField('remainingMeasureKey', e.target.value)}
          >
            <option value="">None</option>
            {(config.quantityMeasures || []).map((m) => (
              <option key={m.columnKey} value={m.columnKey}>{m.label || m.columnKey}</option>
            ))}
          </Select>
        </Field>
        <div className={mergeClasses(styles.grid, isFlyout && styles.gridFlyout)}>
          <Field label="Show capacity line" className={isFlyout ? styles.fieldFlyout : undefined}>
            <Switch
              checked={config.showCapacityLine !== false}
              onChange={(_, data) => onUpdateField('showCapacityLine', data.checked)}
              label={config.showCapacityLine !== false ? 'Visible' : 'Hidden'}
            />
          </Field>
          <Field label="Show warning threshold line" className={isFlyout ? styles.fieldFlyout : undefined}>
            <Switch
              checked={config.showWarningLine !== false}
              onChange={(_, data) => onUpdateField('showWarningLine', data.checked)}
              label={config.showWarningLine !== false ? 'Visible' : 'Hidden'}
            />
          </Field>
        </div>
      </div>

      <div className={mergeClasses(styles.section, isFlyout && styles.sectionFlyout)}>
        <RccpChartWeekRangesEditor
          ranges={config.chartWeekRanges || []}
          compact={isFlyout}
          onChange={(chartWeekRanges) => onUpdateField('chartWeekRanges', chartWeekRanges)}
        />
      </div>

      <div className={mergeClasses(styles.section, isFlyout && styles.sectionFlyout)}>
        <Field label="Excluded PO statuses" hint="Comma-separated status labels to ignore." className={isFlyout ? styles.fieldFlyout : undefined}>
          <Input
            className={isFlyout ? styles.compactControl : undefined}
            size={isFlyout ? 'small' : 'medium'}
            value={(config.excludedStatuses || []).join(', ')}
            onChange={(e) => onUpdateField(
              'excludedStatuses',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            )}
          />
        </Field>
        {statusOptions.length > 0 && (
          <Text size={200} className={styles.hint}>Known statuses: {statusOptions.join(', ')}</Text>
        )}
        <div className={mergeClasses(styles.grid, isFlyout && styles.gridFlyout)}>
          <Field label="Green threshold (%)" className={isFlyout ? styles.fieldFlyout : undefined}>
            <Input
              className={isFlyout ? styles.compactControl : undefined}
              size={isFlyout ? 'small' : 'medium'}
              type="number"
              min={0}
              max={100}
              value={String(config.thresholds?.greenMax ?? 80)}
              onChange={(e) => onUpdateField('thresholds', { ...config.thresholds, greenMax: Number(e.target.value) })}
            />
          </Field>
          <Field label="Orange threshold (%)" className={isFlyout ? styles.fieldFlyout : undefined}>
            <Input
              className={isFlyout ? styles.compactControl : undefined}
              size={isFlyout ? 'small' : 'medium'}
              type="number"
              min={0}
              max={100}
              value={String(config.thresholds?.orangeMax ?? 100)}
              onChange={(e) => onUpdateField('thresholds', { ...config.thresholds, orangeMax: Number(e.target.value) })}
            />
          </Field>
          <Field label="Duplicate import policy" className={isFlyout ? styles.fieldFlyout : undefined}>
            <Select
              className={isFlyout ? styles.compactControl : undefined}
              size={isFlyout ? 'small' : 'medium'}
              value={config.duplicatePolicy || 'update'}
              onChange={(e) => onUpdateField('duplicatePolicy', e.target.value)}
            >
              <option value="update">Update existing rows</option>
              <option value="skip">Skip duplicates</option>
            </Select>
          </Field>
        </div>
      </div>

      {!isFlyout && actions}
    </div>
  );
}

export default memo(RccpSettingsForm);
