import React, { memo } from 'react';
import {
  Button, Field, Input, Select, Spinner, Text, makeStyles, tokens, shorthands, mergeClasses,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import RccpQuantityMeasuresEditor from './RccpQuantityMeasuresEditor';
import RccpChartWeekRangesEditor from './RccpChartWeekRangesEditor';

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

      <div className={mergeClasses(styles.section, isFlyout && styles.sectionFlyout)}>
        <RccpQuantityMeasuresEditor
          measures={config.quantityMeasures || []}
          columns={columns}
          compact={isFlyout}
          onChange={(quantityMeasures) => onUpdateField('quantityMeasures', quantityMeasures)}
        />
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
