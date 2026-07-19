import { useCallback, useMemo, useState } from 'react';
import {
  CHART_SIZE_MEDIUM, CHART_SIZE_SMALL, CHART_SIZE_WIDE,
  CHART_TYPE_OPTIONS, createEmptyChartConfig, normalizeMeasureStyles, resolveMeasures, supportsMultipleMeasures,
} from '../biConstants';

const VALID_CHART_TYPES = new Set(CHART_TYPE_OPTIONS.map((option) => option.key));

function normalizeChartType(value) {
  const candidate = String(value || '').trim().toLowerCase();
  return VALID_CHART_TYPES.has(candidate) ? candidate : null;
}

function normalizeConfig(raw) {
  const base = createEmptyChartConfig();
  const merged = { ...base, ...(raw || {}) };
  merged.options = { ...base.options, ...(merged.options || {}) };
  const normalizedType = normalizeChartType(merged.type);
  if (normalizedType) merged.type = normalizedType;
  merged.measures = resolveMeasures(merged);
  if (!merged.measures.length && merged.measure) merged.measures = [merged.measure];
  if (merged.measures.length === 1) merged.measure = merged.measures[0];
  merged.options.measureStyles = normalizeMeasureStyles(
    merged.measures,
    merged.options?.measureStyles,
  );
  return merged;
}

function initialState(chart) {
  return {
    name: chart?.name || '',
    visibility: chart?.visibility || 'private',
    config: normalizeConfig(chart?.config),
  };
}

/**
 * Builder-state voor het bouwen/bewerken van één grafiek.
 * @param {object} [chart] - bestaande grafiek om te bewerken (optioneel).
 * @param {Array<object>} columns - kolom-metadata (key/label/dataType).
 */
export function useChartBuilder(chart, columns = []) {
  const [state, setState] = useState(() => initialState(chart));

  const setName = useCallback((name) => setState((prev) => ({ ...prev, name })), []);
  const setVisibility = useCallback((visibility) => setState((prev) => ({ ...prev, visibility })), []);

  const setConfigField = useCallback((field, value) => {
    setState((prev) => {
      const nextConfig = { ...prev.config, [field]: value };
      if (field === 'type') {
        const nextType = normalizeChartType(value);
        if (!nextType) return prev;
        nextConfig.type = nextType;
        if (!supportsMultipleMeasures(nextType)) {
          nextConfig.measures = nextConfig.measures.slice(0, 1);
          nextConfig.measure = nextConfig.measures[0] || '';
        }
        if (nextType === 'kpi') {
          nextConfig.dimension = '';
          nextConfig.options = { ...nextConfig.options, chartSize: CHART_SIZE_SMALL, measureStyles: {} };
        } else if (nextType === 'pie') {
          nextConfig.options = { ...nextConfig.options, chartSize: CHART_SIZE_MEDIUM, measureStyles: {} };
        } else if (nextType === 'bar' || nextType === 'line') {
          const size = nextConfig.options?.chartSize;
          if (size !== CHART_SIZE_MEDIUM && size !== CHART_SIZE_WIDE) {
            nextConfig.options = { ...nextConfig.options, chartSize: CHART_SIZE_MEDIUM };
          }
          if (nextType === 'line') {
            nextConfig.options = { ...nextConfig.options, measureStyles: {} };
          } else {
            nextConfig.options = {
              ...nextConfig.options,
              measureStyles: normalizeMeasureStyles(
                resolveMeasures(nextConfig),
                nextConfig.options?.measureStyles,
              ),
            };
          }
        }
      }
      if (field === 'dimension') {
        const col = columns.find((entry) => entry.key === value);
        if (col?.dataType === 'date' && (!nextConfig.dateGrouping || nextConfig.dateGrouping === 'none')) {
          nextConfig.dateGrouping = 'month';
        }
      }
      return { ...prev, config: nextConfig };
    });
  }, [columns]);

  const setMeasures = useCallback((measures) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        measures,
        measure: measures[0] || '',
        options: {
          ...prev.config.options,
          measureStyles: normalizeMeasureStyles(measures, prev.config.options?.measureStyles),
        },
      },
    }));
  }, []);

  const setMeasureStyle = useCallback((measureKey, style) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        options: {
          ...prev.config.options,
          measureStyles: {
            ...(prev.config.options?.measureStyles || {}),
            [measureKey]: style,
          },
        },
      },
    }));
  }, []);

  const setColors = useCallback((colors) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, options: { ...prev.config.options, colors } },
    }));
  }, []);

  const setOption = useCallback((key, value) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        options: { ...prev.config.options, [key]: value },
      },
    }));
  }, []);

  const setChartSize = useCallback((chartSize) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        options: {
          ...prev.config.options,
          chartSize: chartSize === CHART_SIZE_WIDE ? CHART_SIZE_WIDE : CHART_SIZE_MEDIUM,
        },
      },
    }));
  }, []);

  const setFilters = useCallback((filters) => {
    setState((prev) => ({ ...prev, config: { ...prev.config, filters } }));
  }, []);
  const loadFrom = useCallback((next) => setState(initialState(next)), []);
  const reset = useCallback(() => setState(initialState(null)), []);

  const measureColumns = useMemo(
    () => columns.filter((col) => col.dataType === 'number'),
    [columns],
  );

  const dimensionColumn = useMemo(
    () => columns.find((col) => col.key === state.config.dimension) || null,
    [columns, state.config.dimension],
  );

  const isDateDimension = dimensionColumn?.dataType === 'date';
  const selectedMeasures = useMemo(() => resolveMeasures(state.config), [state.config]);
  const multiMeasureMode = supportsMultipleMeasures(state.config.type);

  const colorItems = useMemo(() => {
    if (state.config.type === 'pie') return [];
    if (state.config.type === 'kpi') {
      const measureKey = selectedMeasures[0] || 'value';
      const col = measureColumns.find((entry) => entry.key === measureKey);
      return [{ key: measureKey, label: col?.label || 'Value' }];
    }
    return selectedMeasures.map((key) => {
      const col = measureColumns.find((entry) => entry.key === key);
      return { key, label: col?.label || key };
    });
  }, [state.config.type, selectedMeasures, measureColumns]);

  const isValid = useMemo(() => {
    if (!state.name.trim()) return false;
    if (state.config.aggregation !== 'count' && !selectedMeasures.length) return false;
    if (state.config.type !== 'kpi' && !state.config.dimension) return false;
    return true;
  }, [state, selectedMeasures]);

  const payload = useMemo(() => ({
    name: state.name.trim(),
    visibility: state.visibility,
    config: state.config,
  }), [state]);

  return useMemo(() => ({
    name: state.name,
    visibility: state.visibility,
    config: state.config,
    measureColumns,
    dimensionColumn,
    isDateDimension,
    selectedMeasures,
    multiMeasureMode,
    colorItems,
    isValid,
    payload,
    setName,
    setVisibility,
    setConfigField,
    setMeasures,
    setMeasureStyle,
    setColors,
    setOption,
    setChartSize,
    setFilters,
    loadFrom,
    reset,
  }), [state, measureColumns, dimensionColumn, isDateDimension, selectedMeasures, multiMeasureMode,
    colorItems, isValid, payload, setName, setVisibility, setConfigField, setMeasures, setMeasureStyle,
    setColors, setOption, setChartSize, setFilters, loadFrom, reset]);
}
