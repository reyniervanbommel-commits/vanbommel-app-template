import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  Button, Divider, Dropdown, Field, Input, makeStyles, mergeClasses, Option, shorthands, Text, tokens,
} from '@fluentui/react-components';
import ChartFilterEditor from './ChartFilterEditor';
import ChartMeasureMultiSelect from './ChartMeasureMultiSelect';
import ChartMeasureStyleEditor from './ChartMeasureStyleEditor';
import ChartColorEditor from './ChartColorEditor';
import ChartBuilderFlyoutForm from './ChartBuilderFlyoutForm';
import { useChartBuilder } from './hooks/useChartBuilder';
import {
  AGGREGATION_OPTIONS, CHART_SIZE_MEDIUM, CHART_SIZE_OPTIONS_BAR_LINE, CHART_SIZE_WIDE,
  CHART_TYPE_OPTIONS, COLOR_MODE_RANDOM, DATE_GROUPING_OPTIONS, VALUE_DISPLAY_OPTIONS,
  VISIBILITY_OPTIONS, resolveChartSize, resolveColorMode, resolveValueDisplay,
} from './biConstants';

const NONE_OPTION = { key: '__none__', label: 'None' };

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    width: '100%',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow8,
  },
  section: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px') },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    ...shorthands.gap('12px'),
  },
  fieldNarrow: { maxWidth: '320px' },
  nameInputFlyout: {
    width: '100%',
    '& .fui-Input__input': {
      fontSize: '15px',
      fontWeight: 600,
      color: tokens.colorBrandForeground1,
      ...shorthands.padding('2px', '0'),
    },
    '& .fui-Input__underline': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
    },
  },
  actions: { display: 'flex', ...shorthands.gap('8px'), justifyContent: 'flex-end' },
  title: { fontSize: '18px', fontWeight: 600 },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

export default function ChartBuilderPanel({
  columns, chart, onSave, onCancel, onDraftChange, onFlyoutChromeChange,
  busy = false, variant = 'page',
}) {
  const styles = useStyles();
  const isFlyout = variant === 'flyout';
  const controlSize = isFlyout ? 'small' : 'medium';
  const builder = useChartBuilder(chart, columns);
  const {
    config, measureColumns, isDateDimension, isValid, multiMeasureMode, selectedMeasures,
  } = builder;
  const countMode = config.aggregation === 'count';
  const colorMode = resolveColorMode(config);
  const valueDisplay = resolveValueDisplay(config);
  const chartOptions = config.options || {};

  useEffect(() => {
    onDraftChange?.(builder.payload);
  }, [builder.payload, onDraftChange]);

  const handleSave = useCallback(() => {
    if (!isValid || busy) return;
    onSave(builder.payload);
  }, [isValid, busy, onSave, builder.payload]);

  const handleNameChange = useCallback((_, data) => {
    builder.setName(data.value);
  }, [builder]);

  useLayoutEffect(() => {
    if (!isFlyout) {
      onFlyoutChromeChange?.({ actions: null, nameField: null });
      return undefined;
    }
    onFlyoutChromeChange?.({
      nameField: (
        <Input
          className={styles.nameInputFlyout}
          appearance="underline"
          size="medium"
          value={builder.name}
          onChange={handleNameChange}
          placeholder="Chart name"
          aria-label="Chart name"
        />
      ),
      actions: (
        <>
          <Button size="small" appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="small" appearance="primary" onClick={handleSave} disabled={!isValid || busy}>
            {busy ? 'Saving…' : 'Save chart'}
          </Button>
        </>
      ),
    });
    return () => onFlyoutChromeChange?.({ actions: null, nameField: null });
  }, [isFlyout, isValid, busy, handleSave, onCancel, onFlyoutChromeChange, builder.name, handleNameChange, styles.nameInputFlyout]);

  const dimensionLabel = columns.find((col) => col.key === config.dimension)?.label
    || (config.dimension ? config.dimension : NONE_OPTION.label);
  const measureLabel = measureColumns.find((col) => col.key === config.measure)?.label
    || (config.measure ? config.measure : NONE_OPTION.label);

  if (isFlyout) {
    return (
      <ChartBuilderFlyoutForm
        builder={builder}
        columns={columns}
        config={config}
        measureColumns={measureColumns}
        isDateDimension={isDateDimension}
        multiMeasureMode={multiMeasureMode}
        selectedMeasures={selectedMeasures}
        countMode={countMode}
      />
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <Text className={styles.title}>{chart ? 'Edit chart' : 'New chart'}</Text>

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Details</Text>
          <div className={styles.fieldGrid}>
            <Field label="Name" required className={styles.fieldNarrow}>
              <Input
                size={controlSize}
                value={builder.name}
                onChange={handleNameChange}
                placeholder="Chart name"
              />
            </Field>
            <Field label="Visibility" className={styles.fieldNarrow}>
              <Dropdown
                size={controlSize}
                selectedOptions={[builder.visibility]}
                value={findLabel(VISIBILITY_OPTIONS, builder.visibility)}
                onOptionSelect={(_, data) => builder.setVisibility(data.optionValue)}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                ))}
              </Dropdown>
            </Field>
            {(config.type === 'bar' || config.type === 'line') ? (
              <Field label="Chart size" className={styles.fieldNarrow}>
                <Dropdown
                  size={controlSize}
                  selectedOptions={[resolveChartSize({ config })]}
                  value={findLabel(CHART_SIZE_OPTIONS_BAR_LINE, resolveChartSize({ config }))}
                  onOptionSelect={(_, data) => builder.setChartSize(
                    data.optionValue === CHART_SIZE_WIDE ? CHART_SIZE_WIDE : CHART_SIZE_MEDIUM,
                  )}
                >
                  {CHART_SIZE_OPTIONS_BAR_LINE.map((option) => (
                    <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                  ))}
                </Dropdown>
              </Field>
            ) : null}
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Data</Text>
          <div className={styles.fieldGrid}>
            <Field label="Chart type" className={styles.fieldNarrow}>
              <Dropdown
                size={controlSize}
                selectedOptions={[config.type]}
                value={findLabel(CHART_TYPE_OPTIONS, config.type)}
                onOptionSelect={(_, data) => builder.setConfigField('type', data.optionValue)}
              >
                {CHART_TYPE_OPTIONS.map((option) => (
                  <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Aggregation" className={styles.fieldNarrow}>
              <Dropdown
                size={controlSize}
                selectedOptions={[config.aggregation]}
                value={findLabel(AGGREGATION_OPTIONS, config.aggregation)}
                onOptionSelect={(_, data) => builder.setConfigField('aggregation', data.optionValue)}
              >
                {AGGREGATION_OPTIONS.map((option) => (
                  <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                ))}
              </Dropdown>
            </Field>
            {config.type !== 'kpi' ? (
              <Field label="Dimension" className={styles.fieldNarrow}>
                <Dropdown
                  size={controlSize}
                  selectedOptions={config.dimension ? [config.dimension] : [NONE_OPTION.key]}
                  value={dimensionLabel}
                  onOptionSelect={(_, data) => {
                    const value = data.optionValue === NONE_OPTION.key ? '' : (data.optionValue || '');
                    builder.setConfigField('dimension', value);
                  }}
                >
                  <Option key={NONE_OPTION.key} value={NONE_OPTION.key} text={NONE_OPTION.label}>{NONE_OPTION.label}</Option>
                  {columns.map((col) => (
                    <Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>
                  ))}
                </Dropdown>
              </Field>
            ) : null}
            {config.type !== 'kpi' && isDateDimension ? (
              <Field label="Date grouping" className={styles.fieldNarrow}>
                <Dropdown
                  size={controlSize}
                  selectedOptions={[config.dateGrouping]}
                  value={findLabel(DATE_GROUPING_OPTIONS, config.dateGrouping)}
                  onOptionSelect={(_, data) => builder.setConfigField('dateGrouping', data.optionValue)}
                >
                  {DATE_GROUPING_OPTIONS.map((option) => (
                    <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                  ))}
                </Dropdown>
              </Field>
            ) : null}
            {multiMeasureMode && !countMode ? (
              <>
                <ChartMeasureMultiSelect
                  columns={measureColumns}
                  selectedKeys={selectedMeasures}
                  onChange={builder.setMeasures}
                  size={controlSize}
                />
                {config.type === 'bar' && selectedMeasures.length > 0 ? (
                  <ChartMeasureStyleEditor
                    columns={measureColumns}
                    selectedKeys={selectedMeasures}
                    measureStyles={chartOptions.measureStyles || {}}
                    onMeasureStyleChange={builder.setMeasureStyle}
                  />
                ) : null}
              </>
            ) : (
              <Field label="Value (measure)" hint={countMode ? 'Not used with Count' : undefined} className={styles.fieldNarrow}>
                <Dropdown
                  size={controlSize}
                  disabled={countMode}
                  selectedOptions={config.measure ? [config.measure] : [NONE_OPTION.key]}
                  value={countMode ? NONE_OPTION.label : measureLabel}
                  onOptionSelect={(_, data) => {
                    const value = data.optionValue === NONE_OPTION.key ? '' : (data.optionValue || '');
                    builder.setMeasures(value ? [value] : []);
                  }}
                >
                  <Option key={NONE_OPTION.key} value={NONE_OPTION.key} text={NONE_OPTION.label}>{NONE_OPTION.label}</Option>
                  {measureColumns.map((col) => (
                    <Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>
                  ))}
                </Dropdown>
              </Field>
            )}
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Appearance</Text>
          <div className={styles.fieldGrid}>
            {config.type === 'kpi' ? (
              <Field label="Unit" hint="Shown under the value on the card" className={styles.fieldNarrow}>
                <Input
                  size={controlSize}
                  value={chartOptions.unit || ''}
                  onChange={(_, data) => builder.setOption('unit', data.value)}
                  placeholder="e.g. EUR, pcs"
                />
              </Field>
            ) : null}
            {(config.type === 'bar' || config.type === 'line' || config.type === 'pie') ? (
              <Field label="Data labels" className={styles.fieldNarrow}>
                <Dropdown
                  size={controlSize}
                  selectedOptions={[valueDisplay]}
                  value={findLabel(VALUE_DISPLAY_OPTIONS, valueDisplay)}
                  onOptionSelect={(_, data) => builder.setOption('valueDisplay', data.optionValue)}
                >
                  {VALUE_DISPLAY_OPTIONS.map((option) => (
                    <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                  ))}
                </Dropdown>
              </Field>
            ) : null}
            <div className={styles.fieldNarrow}>
              <ChartColorEditor
                colorMode={colorMode}
                config={config}
                onColorModeChange={(mode) => builder.setOption('colorMode', mode || COLOR_MODE_RANDOM)}
                onSingleColorChange={(color) => builder.setOption('singleColor', color)}
                controlSize={controlSize}
              />
            </div>
          </div>
        </div>

        <Divider />
        <ChartFilterEditor columns={columns} filters={config.filters} onChange={builder.setFilters} />

        <div className={styles.actions}>
          <Button appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button appearance="primary" onClick={handleSave} disabled={!isValid || busy}>
            {busy ? 'Saving…' : 'Save chart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
