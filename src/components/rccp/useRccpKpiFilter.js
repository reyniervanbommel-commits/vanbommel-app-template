import { useCallback, useMemo, useState } from 'react';
import { buildRccpKpiMatrixHighlight, filterRccpChartByKpi } from './rccpKpiChartFilter';

/**
 * Click-to-toggle KPI filter for the RCCP chart and matrix highlight.
 * @param {object[]} chart item-filtered chart points
 * @param {object[]} measureRows
 */
export function useRccpKpiFilter(chart, measureRows) {
  const [selectedKey, setSelectedKey] = useState(null);

  const onSelect = useCallback((key) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  }, []);

  const filteredChart = useMemo(
    () => filterRccpChartByKpi(chart, selectedKey),
    [chart, selectedKey],
  );

  const highlight = useMemo(
    () => buildRccpKpiMatrixHighlight(chart, measureRows, selectedKey),
    [chart, measureRows, selectedKey],
  );

  return { selectedKey, onSelect, filteredChart, highlight };
}
