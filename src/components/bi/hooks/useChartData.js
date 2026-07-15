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

function chartFetchKey(chart, inheritedFilters, dataRevision) {
  return JSON.stringify({
    config: chart?.config || {},
    inheritedFilters,
    dataRevision: dataRevision ?? null,
  });
}

function chartIdKey(id) {
  return String(id);
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
      configKeys: list.map((chart) => chartFetchKey(chart, inheritedFilters, dataRevision)),
    };
  }, [charts, inheritedFilters, dataRevision]);

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
      const key = chartIdKey(id);
      const prevKey = cacheRef.current.configKeys[key];
      return prevKey !== payload.configKeys[index];
    });

    if (!dirtyIds.length) {
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const dirtyKeys = dirtyIds.map(chartIdKey);

    setLoadingById((prev) => {
      const next = { ...prev };
      dirtyKeys.forEach((id) => { next[id] = true; });
      return next;
    });
    setError(null);

    const dirtyKeySet = new Set(dirtyKeys);
    const fetchCharts = [];
    const fetchIds = [];
    payload.ids.forEach((id, index) => {
      const key = chartIdKey(id);
      if (dirtyKeySet.has(key)) {
        fetchIds.push(id);
        fetchCharts.push(payload.charts[index]);
      }
    });

    apiRequest('/bi/aggregate', { method: 'POST', body: { boardKey, charts: fetchCharts } })
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setResultsById((prev) => {
          const next = { ...prev };
          (data.results || []).forEach((result, index) => {
            const id = fetchIds[index];
            const key = chartIdKey(id);
            next[key] = result.series || [];
            cacheRef.current.results[key] = next[key];
            const payloadIndex = payload.ids.findIndex((entry) => chartIdKey(entry) === key);
            cacheRef.current.configKeys[key] = payload.configKeys[payloadIndex];
          });
          return next;
        });
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        setError(err.message || 'Failed to load chart data');
      })
      .finally(() => {
        setLoadingById((prev) => {
          const next = { ...prev };
          dirtyKeys.forEach((id) => { next[id] = false; });
          return next;
        });
      });

    return undefined;
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
