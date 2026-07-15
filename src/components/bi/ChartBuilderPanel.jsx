import React, { useCallback, useMemo } from 'react';
import {
  Button, Divider, Dropdown, Field, Input, makeStyles, mergeClasses, Option, shorthands, Text, tokens,
} from '@fluentui/react-components';
import ChartFilterEditor from './ChartFilterEditor';
import ChartRenderer from './ChartRenderer';
import ChartMeasureMultiSelect from './ChartMeasureMultiSelect';
import ChartColorEditor from './ChartColorEditor';
import { useChartBuilder } from './hooks/useChartBuilder';
import { useChartData } from './hooks/useChartData';
import {
  AGGREGATION_OPTIONS, CHART_TYPE_OPTIONS, CHART_WIDTH_OPTIONS,
  DATE_GROUPING_OPTIONS, VISIBILITY_OPTIONS,
} from './biConstants';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    width: '100%',
  },
  shellFlyout: {
    ...shorthands.gap('16px'),
    ...shorthands.padding('16px', '0', '0'),
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
    ...shorthands.padding('0'),
    boxShadow: 'none',
    ...shorthands.borderRadius(0),
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
  fieldGridFlyout: {
    gridTemplateColumns: '1fr',
  },
  fieldNarrow: { maxWidth: '320px' },
  fieldNarrowFlyout: { maxWidth: '100%' },
  preview: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('12px'),
    minHeight: '240px',
  },
  actions: { display: 'flex', ...shorthands.gap('8px'), justifyContent: 'flex-end' },
  title: { fontSize: '18px', fontWeight: 600 },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

export default function ChartBuilderPanel({
  columns, chart, onSave, onCancel, busy = false, variant = 'page',
}) {
  const styles = useStyles();
  const isFlyout = variant === 'flyout';
  const builder = useChartBuilder(chart, columns);
  const { config, measureColumns, isDateDimension, isValid, multiMeasureMode, selectedMeasures } = builder;
  const countMode = config.aggregation === 'count';

  const previewCharts = useMemo(() => [{ id: 'preview', config }], [config]);
  const { resultsById, loading } = useChartData({ charts: isValid ? previewCharts : [] });
  const previewSeries = resultsById.preview || [];

  const colorItems = useMemo(() => {
    if (config.type === 'pie') {
      return [...new Set(previewSeries.map((entry) => entry.name))].map((name) => ({ key: name, label: name }));
    }
    return builder.colorItems;
  }, [config.type, previewSeries, builder.colorItems]);

  const handleSave = useCallback(() => {
    if (!isValid || busy) return;
    onSave(builder.payload);
  }, [isValid, busy, onSave, builder.payload]);

  const fieldGridClass = mergeClasses(styles.fieldGrid, isFlyout && styles.fieldGridFlyout);
  const fieldClass = isFlyout ? styles.fieldNarrowFlyout : styles.fieldNarrow;

  return (
    <div className={mergeClasses(styles.shell, isFlyout && styles.shellFlyout)}>
      <div className={mergeClasses(styles.panel, isFlyout && styles.panelFlyout)}>
        {!isFlyout ? <Text className={styles.title}>{chart ? 'Edit chart' : 'New chart'}</Text> : null}

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Details</Text>
          <div className={fieldGridClass}>
            <Field label="Name" required className={fieldClass}>
              <Input
                value={builder.name}
                onChange={(_, data) => builder.setName(data.value)}
                placeholder="Chart name"
              />
            </Field>
            <Field label="Visibility" className={fieldClass}>
              <Dropdown
                selectedOptions={[builder.visibility]}
                value={findLabel(VISIBILITY_OPTIONS, builder.visibility)}
                onOptionSelect={(_, data) => builder.setVisibility(data.optionValue)}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Chart width" className={fieldClass}>
              <Dropdown
                selectedOptions={[String(config.options?.gridSpan || 1)]}
                value={findLabel(CHART_WIDTH_OPTIONS, config.options?.gridSpan || 1)}
                onOptionSelect={(_, data) => builder.setGridSpan(data.optionValue)}
              >
                {CHART_WIDTH_OPTIONS.map((option) => (
                  <Option key={option.key} value={String(option.key)} text={option.label}>{option.label}</Option>
                ))}
              </Dropdown>
            </Field>
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Chart setup</Text>
          <div className={fieldGridClass}>
            <Field label="Type" className={fieldClass}>
              <Dropdown
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
                selectedOptions={[config.dimension]}
                value={columns.find((col) => col.key === config.dimension)?.label || ''}
                onOptionSelect={(_, data) => builder.setConfigField('dimension', data.optionValue)}
              >
                {columns.map((col) => (
                  <Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>
                ))}
              </Dropdown>
            </Field>

            {isDateDimension ? (
              <Field label="Date grouping" className={fieldClass}>
                <Dropdown
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
                />
              </div>
            ) : (
              <Field label="Value (measure)" hint={countMode ? 'Not used with Count' : undefined} className={fieldClass}>
                <Dropdown
                  disabled={countMode}
                  selectedOptions={[config.measure]}
                  value={measureColumns.find((col) => col.key === config.measure)?.label || ''}
                  onOptionSelect={(_, data) => builder.setMeasures([data.optionValue])}
                >
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
          <ChartColorEditor
            items={colorItems}
            colors={config.options?.colors || {}}
            onChange={builder.setColors}
          />
        </div>

        <Divider />

        <ChartFilterEditor columns={columns} filters={config.filters} onChange={builder.setFilters} />

        <div className={styles.preview}>
          <Text>{loading ? 'Loading preview…' : 'Preview'}</Text>
          <ChartRenderer
            type={config.type}
            series={previewSeries}
            config={config}
            columns={columns}
            height={220}
          />
        </div>

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
