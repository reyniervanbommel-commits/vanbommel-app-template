import React, { useCallback, useMemo } from 'react';
import {
  Button, Dropdown, Field, Input, makeStyles, Option, shorthands, Text, tokens,
} from '@fluentui/react-components';
import ChartFilterEditor from './ChartFilterEditor';
import ChartRenderer from './ChartRenderer';
import { useChartBuilder } from './hooks/useChartBuilder';
import { useChartData } from './hooks/useChartData';
import {
  AGGREGATION_OPTIONS, CHART_TYPE_OPTIONS, DATE_GROUPING_OPTIONS, VISIBILITY_OPTIONS,
} from './biConstants';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow8,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', ...shorthands.gap('12px') },
  preview: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('8px'),
  },
  actions: { display: 'flex', ...shorthands.gap('8px'), justifyContent: 'flex-end' },
  title: { fontSize: '16px', fontWeight: 600 },
});

const findLabel = (options, key) => options.find((option) => option.key === key)?.label || '';

export default function ChartBuilderPanel({ columns, chart, onSave, onCancel, busy = false }) {
  const styles = useStyles();
  const builder = useChartBuilder(chart, columns);
  const { config, measureColumns, isDateDimension, isValid } = builder;
  const countMode = config.aggregation === 'count';

  const previewCharts = useMemo(
    () => [{ id: 'preview', config }],
    [config],
  );
  const { resultsById, loading } = useChartData({ charts: isValid ? previewCharts : [] });
  const previewSeries = resultsById.preview || [];

  const handleSave = useCallback(() => {
    if (!isValid || busy) return;
    onSave(builder.payload);
  }, [isValid, busy, onSave, builder.payload]);

  return (
    <div className={styles.root}>
      <Text className={styles.title}>{chart ? 'Edit chart' : 'New chart'}</Text>

      <Field label="Name" required>
        <Input value={builder.name} onChange={(_, data) => builder.setName(data.value)} placeholder="Chart name" />
      </Field>

      <div className={styles.grid}>
        <Field label="Type">
          <Dropdown
            selectedOptions={[config.type]}
            value={findLabel(CHART_TYPE_OPTIONS, config.type)}
            onOptionSelect={(_, data) => builder.setConfigField('type', data.optionValue)}
          >
            {CHART_TYPE_OPTIONS.map((option) => (<Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>))}
          </Dropdown>
        </Field>

        <Field label="Aggregation">
          <Dropdown
            selectedOptions={[config.aggregation]}
            value={findLabel(AGGREGATION_OPTIONS, config.aggregation)}
            onOptionSelect={(_, data) => builder.setConfigField('aggregation', data.optionValue)}
          >
            {AGGREGATION_OPTIONS.map((option) => (<Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>))}
          </Dropdown>
        </Field>

        <Field label={config.type === 'kpi' ? 'Dimension (optional)' : 'Dimension'}>
          <Dropdown
            selectedOptions={[config.dimension]}
            value={columns.find((col) => col.key === config.dimension)?.label || ''}
            onOptionSelect={(_, data) => builder.setConfigField('dimension', data.optionValue)}
          >
            {columns.map((col) => (<Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>))}
          </Dropdown>
        </Field>

        <Field label="Value (measure)" hint={countMode ? 'Not used with Count' : undefined}>
          <Dropdown
            disabled={countMode}
            selectedOptions={[config.measure]}
            value={measureColumns.find((col) => col.key === config.measure)?.label || ''}
            onOptionSelect={(_, data) => builder.setConfigField('measure', data.optionValue)}
          >
            {measureColumns.map((col) => (<Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>))}
          </Dropdown>
        </Field>

        {isDateDimension ? (
          <Field label="Date grouping">
            <Dropdown
              selectedOptions={[config.dateGrouping]}
              value={findLabel(DATE_GROUPING_OPTIONS, config.dateGrouping)}
              onOptionSelect={(_, data) => builder.setConfigField('dateGrouping', data.optionValue)}
            >
              {DATE_GROUPING_OPTIONS.map((option) => (<Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>))}
            </Dropdown>
          </Field>
        ) : null}

        <Field label="Visibility">
          <Dropdown
            selectedOptions={[builder.visibility]}
            value={findLabel(VISIBILITY_OPTIONS, builder.visibility)}
            onOptionSelect={(_, data) => builder.setVisibility(data.optionValue)}
          >
            {VISIBILITY_OPTIONS.map((option) => (<Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>))}
          </Dropdown>
        </Field>
      </div>

      <ChartFilterEditor columns={columns} filters={config.filters} onChange={builder.setFilters} />

      <div className={styles.preview}>
        <Text>{loading ? 'Loading preview…' : 'Preview'}</Text>
        <ChartRenderer type={config.type} series={previewSeries} height={220} />
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button appearance="primary" onClick={handleSave} disabled={!isValid || busy}>
          {busy ? 'Saving…' : 'Save chart'}
        </Button>
      </div>
    </div>
  );
}
