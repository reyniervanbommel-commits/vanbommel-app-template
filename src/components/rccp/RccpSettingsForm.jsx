import React, { memo } from 'react';
import {
  Button, Field, Input, Select, Spinner, Text, makeStyles, tokens, shorthands, mergeClasses,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import RccpQuantityMeasuresEditor from './RccpQuantityMeasuresEditor';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  rootFlyout: { ...shorthands.gap('16px') },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  sectionFlyout: {
    ...shorthands.padding('16px'),
    ...shorthands.gap('12px'),
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', ...shorthands.gap('12px') },
  gridFlyout: { display: 'flex', flexDirection: 'column', ...shorthands.gap('10px'), alignItems: 'flex-start' },
  fieldFlyout: { width: 'auto', maxWidth: '100%' },
  controlShell: { maxWidth: '168px', overflowX: 'auto', width: '100%' },
  controlShellWide: { maxWidth: '240px' },
  controlShellNarrow: { maxWidth: '88px' },
  hint: { color: tokens.colorNeutralForeground3 },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
});

function ControlShell({ compact, wide, narrow, children }) {
  const styles = useStyles();
  if (!compact) return children;
  return (
    <div className={mergeClasses(styles.controlShell, wide && styles.controlShellWide, narrow && styles.controlShellNarrow)}>
      {children}
    </div>
  );
}

function ColumnSelect({ label, value, onChange, columns, hint, compact }) {
  const styles = useStyles();
  return (
    <Field label={label} hint={hint} className={compact ? styles.fieldFlyout : undefined}>
      <ControlShell compact={compact}>
        <Select size={compact ? 'small' : 'medium'} value={value} onChange={(e) => onChange(e.target.value)}>
          {columns.map((col) => (
            <option key={`${col.scope}-${col.key}`} value={col.key}>{col.label || col.key}</option>
          ))}
        </Select>
      </ControlShell>
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
        <Field label="Excluded PO statuses" hint="Comma-separated status labels to ignore." className={isFlyout ? styles.fieldFlyout : undefined}>
          <ControlShell compact={isFlyout} wide>
            <Input
              size={isFlyout ? 'small' : 'medium'}
              value={(config.excludedStatuses || []).join(', ')}
              onChange={(e) => onUpdateField(
                'excludedStatuses',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              )}
            />
          </ControlShell>
        </Field>
        {statusOptions.length > 0 && (
          <Text size={200} className={styles.hint}>Known statuses: {statusOptions.join(', ')}</Text>
        )}
        <div className={mergeClasses(styles.grid, isFlyout && styles.gridFlyout)}>
          <Field label="Green threshold (%)" className={isFlyout ? styles.fieldFlyout : undefined}>
            <ControlShell compact={isFlyout} narrow>
              <Input
                size={isFlyout ? 'small' : 'medium'}
                type="number"
                value={String(config.thresholds?.greenMax ?? 80)}
                onChange={(e) => onUpdateField('thresholds', { ...config.thresholds, greenMax: Number(e.target.value) })}
              />
            </ControlShell>
          </Field>
          <Field label="Orange threshold (%)" className={isFlyout ? styles.fieldFlyout : undefined}>
            <ControlShell compact={isFlyout} narrow>
              <Input
                size={isFlyout ? 'small' : 'medium'}
                type="number"
                value={String(config.thresholds?.orangeMax ?? 100)}
                onChange={(e) => onUpdateField('thresholds', { ...config.thresholds, orangeMax: Number(e.target.value) })}
              />
            </ControlShell>
          </Field>
          <Field label="Duplicate import policy" className={isFlyout ? styles.fieldFlyout : undefined}>
            <ControlShell compact={isFlyout} wide>
              <Select
                size={isFlyout ? 'small' : 'medium'}
                value={config.duplicatePolicy || 'update'}
                onChange={(e) => onUpdateField('duplicatePolicy', e.target.value)}
              >
                <option value="update">Update existing rows</option>
                <option value="skip">Skip duplicates</option>
              </Select>
            </ControlShell>
          </Field>
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={onSave} disabled={saving}>Save settings</Button>
        {saving && <Spinner size="tiny" />}
        {saved && <Text className={styles.hint}>Saved</Text>}
        {error && <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text>}
      </div>
    </div>
  );
}

export default memo(RccpSettingsForm);
