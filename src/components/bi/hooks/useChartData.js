import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { BOARD_KEY } from '../biConstants';

// Zet het filterByColumn-object van de tabel om naar de filter-array die de aggregate-endpoint verwacht.
function filtersFromColumnMap(filterByColumn) {
  if (!filterByColumn || typeof filterByColumn !== 'object') return [];
  return Object.entries(filterByColumn)
    .filter(([, filter]) => filter && filter.operator)
    .map(([columnKey, filter]) => ({
      columnKey,
      operator: filter.operator,
      value: filter.value ?? '',
      secondaryValue: filter.secondaryValue ?? '',
    }));
}

/**
 * Haalt geaggregeerde series op voor meerdere charts in ÉÉN request (POST /api/bi/aggregate).
 * @param {object} params
 * @param {Array<{id:number|string, config:object}>} params.charts
 * @param {object} [params.externalFilterByColumn] - actieve tabelfilters om te erven (split-screen).
 * @param {string|number} [params.dataRevision] - fingerprint van tabeldata voor live refresh.
 * @param {string} [params.boardKey]
 * @returns {{ resultsById: Record<string, Array>, loading: boolean, error: string|null }}
 */
export function useChartData({ charts, externalFilterByColumn, dataRevision, boardKey = BOARD_KEY }) {
  const [resultsById, setResultsById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const inheritedFilters = useMemo(
    () => filtersFromColumnMap(externalFilterByColumn),
    [externalFilterByColumn],
  );

  const payload = useMemo(() => {
    const list = Array.isArray(charts) ? charts : [];
    return {
      ids: list.map((chart) => chart.id),
      charts: list.map((chart) => ({
        ...chart.config,
        filters: [...(chart.config?.filters || []), ...inheritedFilters],
      })),
    };
  }, [charts, inheritedFilters]);

  const payloadKey = useMemo(
    () => JSON.stringify({ payload, boardKey, dataRevision: dataRevision ?? null }),
    [payload, boardKey, dataRevision],
  );

  useEffect(() => {
    if (!payload.charts.length) {
      setResultsById({});
      return undefined;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest('/bi/aggregate', { method: 'POST', body: { boardKey, charts: payload.charts } })
      .then((data) => {
        if (!active || requestIdRef.current !== requestId) return;
        const next = {};
        (data.results || []).forEach((result, index) => {
          next[payload.ids[index]] = result.series || [];
        });
        setResultsById(next);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load chart data');
      })
      .finally(() => {
        if (active && requestIdRef.current === requestId) setLoading(false);
      });
    return () => { active = false; };
  }, [payloadKey, boardKey, payload]);

  return useMemo(() => ({ resultsById, loading, error }), [resultsById, loading, error]);
}
