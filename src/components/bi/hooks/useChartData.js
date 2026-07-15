import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { BOARD_KEY } from '../biConstants';

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

function chartConfigKey(chart) {
  return JSON.stringify(chart?.config || {});
}

/**
 * Haalt geaggregeerde series op voor charts via POST /api/bi/aggregate.
 * @returns {{ resultsById, loadingById, loading, error }}
 */
export function useChartData({ charts, externalFilterByColumn, dataRevision, boardKey = BOARD_KEY }) {
  const [resultsById, setResultsById] = useState({});
  const [loadingById, setLoadingById] = useState({});
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef({ results: {}, configKeys: {} });

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
      configKeys: list.map((chart) => chartConfigKey(chart)),
    };
  }, [charts, inheritedFilters]);

  const payloadKey = useMemo(
    () => JSON.stringify({ payload, boardKey, dataRevision: dataRevision ?? null }),
    [payload, boardKey, dataRevision],
  );

  const loading = useMemo(
    () => Object.values(loadingById).some(Boolean),
    [loadingById],
  );

  useEffect(() => {
    if (!payload.charts.length) {
      return undefined;
    }

    const dirtyIds = payload.ids.filter((id, index) => {
      const prevKey = cacheRef.current.configKeys[id];
      return prevKey !== payload.configKeys[index];
    });

    if (!dirtyIds.length) {
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    setLoadingById((prev) => {
      const next = { ...prev };
      dirtyIds.forEach((id) => { next[id] = true; });
      return next;
    });
    setError(null);

    const dirtyIdSet = new Set(dirtyIds.map(String));
    const fetchCharts = [];
    const fetchIds = [];
    payload.ids.forEach((id, index) => {
      if (dirtyIdSet.has(String(id))) {
        fetchIds.push(id);
        fetchCharts.push(payload.charts[index]);
      }
    });

    apiRequest('/bi/aggregate', { method: 'POST', body: { boardKey, charts: fetchCharts } })
      .then((data) => {
        if (!active || requestIdRef.current !== requestId) return;
        setResultsById((prev) => {
          const next = { ...prev };
          (data.results || []).forEach((result, index) => {
            const id = fetchIds[index];
            next[id] = result.series || [];
            cacheRef.current.results[id] = next[id];
            cacheRef.current.configKeys[id] = payload.configKeys[payload.ids.indexOf(id)];
          });
          return next;
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load chart data');
      })
      .finally(() => {
        if (!active || requestIdRef.current !== requestId) return;
        setLoadingById((prev) => {
          const next = { ...prev };
          dirtyIds.forEach((id) => { next[id] = false; });
          return next;
        });
      });

    return () => { active = false; };
  }, [payloadKey, boardKey, payload]);

  useEffect(() => {
    if (!payload.charts.length) {
      setResultsById({});
      setLoadingById({});
      cacheRef.current = { results: {}, configKeys: {} };
    }
  }, [payload.charts.length]);

  return useMemo(
    () => ({ resultsById, loadingById, loading, error }),
    [resultsById, loadingById, loading, error],
  );
}
