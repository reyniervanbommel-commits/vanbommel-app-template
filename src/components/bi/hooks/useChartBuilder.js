import { useCallback, useMemo, useState } from 'react';
import { createEmptyChartConfig } from '../biConstants';

function initialState(chart) {
  return {
    name: chart?.name || '',
    visibility: chart?.visibility || 'private',
    config: chart?.config ? { ...createEmptyChartConfig(), ...chart.config } : createEmptyChartConfig(),
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
    setState((prev) => ({ ...prev, config: { ...prev.config, [field]: value } }));
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

  const isValid = useMemo(() => {
    if (!state.name.trim()) return false;
    if (state.config.aggregation !== 'count' && !state.config.measure) return false;
    if (state.config.type !== 'kpi' && !state.config.dimension) return false;
    return true;
  }, [state]);

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
    isValid,
    payload,
    setName,
    setVisibility,
    setConfigField,
    setFilters,
    loadFrom,
    reset,
  }), [state, measureColumns, dimensionColumn, isDateDimension, isValid, payload,
    setName, setVisibility, setConfigField, setFilters, loadFrom, reset]);
}
