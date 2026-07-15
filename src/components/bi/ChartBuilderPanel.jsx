import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  Button, Divider, Dropdown, Field, Input, makeStyles, mergeClasses, Option, shorthands, Text, tokens,
} from '@fluentui/react-components';
import ChartFilterEditor from './ChartFilterEditor';
import ChartMeasureMultiSelect from './ChartMeasureMultiSelect';
import ChartColorEditor from './ChartColorEditor';
import { useChartBuilder } from './hooks/useChartBuilder';
import { useChartData } from './hooks/useChartData';
import {
  AGGREGATION_OPTIONS, CHART_SIZE_MEDIUM, CHART_SIZE_OPTIONS_BAR_LINE, CHART_SIZE_WIDE,
  CHART_TYPE_OPTIONS, DATE_GROUPING_OPTIONS, SERIES_COLOR_KEY, VISIBILITY_OPTIONS,
  resolveChartSize, resolveMeasures,
} from './biConstants';

const NONE_OPTION = { key: '__none__', label: 'None' };

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    width: '100%',
  },
  shellFlyout: {
    ...shorthands.gap('10px'),
    ...shorthands.padding('10px', '0', '0'),
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
  panelFlyout: {
    ...shorthands.gap('10px'),
    ...shorthands.padding('0'),
    boxShadow: 'none',
    ...shorthands.borderRadius(0),
  },
  section: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px') },
  sectionFlyout: { ...shorthands.gap('6px') },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sectionTitleFlyout: { fontSize: '10px', letterSpacing: '0.06em' },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    ...shorthands.gap('12px'),
  },
  fieldGridFlyout: {
    gridTemplateColumns: '1fr',
    ...shorthands.gap('8px'),
  },
  fieldGridFlyoutPair: {
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('8px'),
  },
  fieldNarrow: { maxWidth: '320px' },
  fieldNarrowFlyout: { maxWidth: '100%' },
  fieldCompact: {
    '& label': { fontSize: '11px' },
    '& .fui-Field__hint': { fontSize: '10px' },
  },
  actions: { display: 'flex', ...shorthands.gap('8px'), justifyContent: 'flex-end' },
  title: { fontSize: '18px', fontWeight: 600 },
  dividerFlyout: { marginTop: '2px', marginBottom: '2px' },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

function usesDimensionColors(type, config) {
  const measures = resolveMeasures(config);
  if (measures.length > 1) return false;
  if (type === 'pie') return Boolean(config.dimension);
  if (type === 'bar' || type === 'line') return Boolean(config.dimension);
  return false;
}

function usesSeriesColor(type, config) {
  if (type !== 'bar' && type !== 'line') return false;
  return resolveMeasures(config).length <= 1;
}

export default function ChartBuilderPanel({
  columns, chart, onSave, onCancel, onDraftChange, onFlyoutChromeChange,
  busy = false, variant = 'page',
}) {
  const styles = useStyles();
  const isFlyout = variant === 'flyout';
  const controlSize = isFlyout ? 'small' : 'medium';
  const builder = useChartBuilder(chart, columns);
  const { config, measureColumns, isDateDimension, isValid, multiMeasureMode, selectedMeasures } = builder;
  const countMode = config.aggregation === 'count';

  const previewCharts = useMemo(() => [{ id: 'preview', config }], [config]);
  const { resultsById } = useChartData({ charts: previewCharts });
  const previewSeries = resultsById.preview || [];

  const colorItems = useMemo(() => {
    if (usesDimensionColors(config.type, config)) {
      const segmentItems = [...new Set(previewSeries.map((entry) => entry.name))]
        .map((name) => ({ key: name, label: name }));
      if (usesSeriesColor(config.type, config)) {
        return [{ key: SERIES_COLOR_KEY, label: 'Series color' }, ...segmentItems];
      }
      return segmentItems;
    }
    if (usesSeriesColor(config.type, config)) {
      return [{ key: SERIES_COLOR_KEY, label: 'Series color' }, ...builder.colorItems];
    }
    return builder.colorItems;
  }, [config.type, config, previewSeries, builder.colorItems]);

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
          size="small"
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
  }, [isFlyout, isValid, busy, handleSave, onCancel, onFlyoutChromeChange, builder.name, handleNameChange]);

  const fieldGridClass = mergeClasses(
    styles.fieldGrid,
    isFlyout && styles.fieldGridFlyout,
    isFlyout && (config.type === 'bar' || config.type === 'line') && styles.fieldGridFlyoutPair,
  );
  const fieldClass = mergeClasses(
    isFlyout ? styles.fieldNarrowFlyout : styles.fieldNarrow,
    isFlyout && styles.fieldCompact,
  );
  const sectionClass = mergeClasses(styles.section, isFlyout && styles.sectionFlyout);
  const sectionTitleClass = mergeClasses(styles.sectionTitle, isFlyout && styles.sectionTitleFlyout);

  const dimensionLabel = columns.find((col) => col.key === config.dimension)?.label
    || (config.dimension ? config.dimension : NONE_OPTION.label);

  const measureLabel = measureColumns.find((col) => col.key === config.measure)?.label
    || (config.measure ? config.measure : NONE_OPTION.label);

  return (
    <div className={mergeClasses(styles.shell, isFlyout && styles.shellFlyout)}>
      <div className={mergeClasses(styles.panel, isFlyout && styles.panelFlyout)}>
        {!isFlyout ? <Text className={styles.title}>{chart ? 'Edit chart' : 'New chart'}</Text> : null}

        <div className={sectionClass}>
          {!isFlyout ? <Text className={sectionTitleClass}>Details</Text> : null}
          <div className={fieldGridClass}>
            {!isFlyout ? (
              <Field label="Name" required className={fieldClass}>
                <Input
                  size={controlSize}
                  value={builder.name}
                  onChange={handleNameChange}
                  placeholder="Chart name"
                />
              </Field>
            ) : null}
            <Field label="Visibility" className={fieldClass}>
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
              <Field label="Chart size" className={fieldClass}>
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

        <Divider className={isFlyout ? styles.dividerFlyout : undefined} />

        <div className={sectionClass}>
          <Text className={sectionTitleClass}>Chart setup</Text>
          <div className={fieldGridClass}>
            <Field label="Type" className={fieldClass}>
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

            <Field label="Aggregation" className={fieldClass}>
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

            <Field label={config.type === 'kpi' ? 'Dimension (optional)' : 'Dimension'} className={fieldClass}>
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

            {isDateDimension ? (
              <Field label="Date grouping" className={fieldClass}>
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
              <div className={fieldClass}>
                <ChartMeasureMultiSelect
                  columns={measureColumns}
                  selectedKeys={selectedMeasures}
                  onChange={builder.setMeasures}
                  size={controlSize}
                />
              </div>
            ) : (
              <Field label="Value (measure)" hint={countMode ? 'Not used with Count' : undefined} className={fieldClass}>
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

        {colorItems.length ? (
          <>
            <Divider className={isFlyout ? styles.dividerFlyout : undefined} />
            <div className={sectionClass}>
              <ChartColorEditor
                items={colorItems}
                colors={config.options?.colors || {}}
                onChange={builder.setColors}
                wide={isFlyout}
                compact={isFlyout}
              />
            </div>
          </>
        ) : null}

        <Divider className={isFlyout ? styles.dividerFlyout : undefined} />
        <ChartFilterEditor columns={columns} filters={config.filters} onChange={builder.setFilters} compact={isFlyout} />

        {!isFlyout ? (
          <div className={styles.actions}>
            <Button appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button appearance="primary" onClick={handleSave} disabled={!isValid || busy}>
              {busy ? 'Saving…' : 'Save chart'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
