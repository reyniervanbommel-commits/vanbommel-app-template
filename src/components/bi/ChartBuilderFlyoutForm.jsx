import React, { memo } from 'react';
import { Dropdown, Field, Input, makeStyles, Option } from '@fluentui/react-components';
import ChartBuilderFlyoutSection from './ChartBuilderFlyoutSection';
import ChartColorEditor from './ChartColorEditor';
import ChartFilterEditor from './ChartFilterEditor';
import ChartMeasureMultiSelect from './ChartMeasureMultiSelect';
import ChartMeasureStyleEditor from './ChartMeasureStyleEditor';
import {
  AGGREGATION_OPTIONS, CHART_SIZE_MEDIUM, CHART_SIZE_OPTIONS_BAR_LINE, CHART_SIZE_WIDE,
  CHART_TYPE_OPTIONS, COLOR_MODE_RANDOM, DATE_GROUPING_OPTIONS, VALUE_DISPLAY_OPTIONS,
  VISIBILITY_OPTIONS, resolveChartSize, resolveColorMode, resolveValueDisplay,
} from './biConstants';

const NONE_OPTION = { key: '__none__', label: 'None' };
const CONTROL_SIZE = 'small';

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

const useStyles = makeStyles({
  // Full-width controls in het smalle flyout-paneel — via eigen class i.p.v. Fluent-interne selectors.
  control: { width: '100%', maxWidth: '100%' },
});

function ChartBuilderFlyoutForm({
  builder,
  columns,
  config,
  measureColumns,
  isDateDimension,
  multiMeasureMode,
  selectedMeasures,
  countMode,
}) {
  const styles = useStyles();
  const colorMode = resolveColorMode(config);
  const valueDisplay = resolveValueDisplay(config);
  const chartOptions = config.options || {};
  const dimensionLabel = columns.find((col) => col.key === config.dimension)?.label
    || (config.dimension ? config.dimension : NONE_OPTION.label);
  const measureLabel = measureColumns.find((col) => col.key === config.measure)?.label
    || (config.measure ? config.measure : NONE_OPTION.label);

  return (
    <>
      <ChartBuilderFlyoutSection title="General">
        <Field label="Visibility" size={CONTROL_SIZE}>
          <Dropdown
            className={styles.control}
            size={CONTROL_SIZE}
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
          <Field label="Chart size" size={CONTROL_SIZE}>
            <Dropdown
              className={styles.control}
              size={CONTROL_SIZE}
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
      </ChartBuilderFlyoutSection>

      <ChartBuilderFlyoutSection title="Data">
        <Field label="Chart type" size={CONTROL_SIZE}>
          <Dropdown
            className={styles.control}
            size={CONTROL_SIZE}
            selectedOptions={[config.type]}
            value={findLabel(CHART_TYPE_OPTIONS, config.type)}
            onOptionSelect={(_, data) => builder.setConfigField('type', data.optionValue)}
          >
            {CHART_TYPE_OPTIONS.map((option) => (
              <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Aggregation" size={CONTROL_SIZE}>
          <Dropdown
            className={styles.control}
            size={CONTROL_SIZE}
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
          <Field label="Dimension" size={CONTROL_SIZE}>
            <Dropdown
              className={styles.control}
              size={CONTROL_SIZE}
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
          <Field label="Date grouping" size={CONTROL_SIZE}>
            <Dropdown
              className={styles.control}
              size={CONTROL_SIZE}
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
              size={CONTROL_SIZE}
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
          <Field
            label="Value (measure)"
            hint={countMode ? 'Not used with Count' : undefined}
            size={CONTROL_SIZE}
          >
            <Dropdown
              className={styles.control}
              size={CONTROL_SIZE}
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
      </ChartBuilderFlyoutSection>

      <ChartBuilderFlyoutSection title="Appearance">
        {config.type === 'kpi' ? (
          <Field label="Unit" hint="Shown under the value on the card" size={CONTROL_SIZE}>
            <Input
              className={styles.control}
              size={CONTROL_SIZE}
              value={chartOptions.unit || ''}
              onChange={(_, data) => builder.setOption('unit', data.value)}
              placeholder="e.g. EUR, pcs"
            />
          </Field>
        ) : null}

        {(config.type === 'bar' || config.type === 'line' || config.type === 'pie') ? (
          <Field label="Data labels" size={CONTROL_SIZE}>
            <Dropdown
              className={styles.control}
              size={CONTROL_SIZE}
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

        <ChartColorEditor
          colorMode={colorMode}
          config={config}
          onColorModeChange={(mode) => builder.setOption('colorMode', mode || COLOR_MODE_RANDOM)}
          onSingleColorChange={(color) => builder.setOption('singleColor', color)}
          embedded
          controlSize={CONTROL_SIZE}
        />
      </ChartBuilderFlyoutSection>

      <ChartBuilderFlyoutSection title="Filters">
        <ChartFilterEditor
          columns={columns}
          filters={config.filters}
          onChange={builder.setFilters}
          compact
          stacked
        />
      </ChartBuilderFlyoutSection>
    </>
  );
}

export default memo(ChartBuilderFlyoutForm);
