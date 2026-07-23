import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { BOARD_KEY } from '../biConstants';
import { getBiSeries, setBiSeries, setBiRevision } from '../../../utils/biBoardCache';

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
 * Genereert het generieke week/jaar-filter voor één chart: alleen wanneer de dimensie van die
 * chart een datumkolom is, wordt een `between`-filter op díe kolom toegevoegd.
 */
function dateFilterForChart(chart, columnTypeByKey, dateRange) {
  if (!dateRange) return null;
  const dimension = chart?.config?.dimension;
  if (!dimension || columnTypeByKey[dimension] !== 'date') return null;
  return {
    columnKey: dimension,
    operator: 'between',
    value: dateRange.start,
    secondaryValue: dateRange.end,
  };
}

// Cache-key per chart: config + overgeërfde filters + (optioneel) client-dataRevision + datumfilter.
function chartFetchKey(chart, inheritedFilters, dataRevision, dateFilter) {
  return JSON.stringify({
    config: chart?.config || {},
    inheritedFilters,
    dateFilter: dateFilter || null,
    dataRevision: dataRevision ?? null,
  });
}

/**
 * Haalt geaggregeerde series op voor charts via POST /api/bi/aggregate.
 *
 * Cache-strategie (survives navigatie): resultaten worden per chart-key in `biBoardCache`
 * bewaard. Met `checkRevision` doet de hook bij mount een lichtgewicht GET /api/bi/revision;
 * is het board niet gewijzigd, dan komen de series direct uit de cache (geen fetch, instant paint).
 * De split-view geeft in plaats daarvan `dataRevision` mee (onderdeel van de key).
 *
 * @returns {{ resultsById, loadingById, loading, error }}
 */
export function useChartData({
  charts, externalFilterByColumn, columns, dateRange, dataRevision,
  checkRevision = false, revisionNonce = 0, boardKey = BOARD_KEY,
}) {
  const [resultsById, setResultsById] = useState({});
  const [loadingById, setLoadingById] = useState({});
  const [error, setError] = useState(null);
  const [revisionReady, setRevisionReady] = useState(!checkRevision);
  const requestIdRef = useRef(0);

  const inheritedFilters = useMemo(
    () => filtersFromColumnMap(externalFilterByColumn),
    [externalFilterByColumn],
  );

  const columnTypeByKey = useMemo(() => {
    const map = {};
    (columns || []).forEach((col) => { if (col?.key) map[col.key] = col.dataType; });
    return map;
  }, [columns]);

  const payload = useMemo(() => {
    const list = Array.isArray(charts) ? charts : [];
    return {
      ids: list.map((chart) => chart.id),
      charts: list.map((chart) => {
        const dateFilter = dateFilterForChart(chart, columnTypeByKey, dateRange);
        return {
          ...chart.config,
          filters: [
            ...(chart.config?.filters || []),
            ...inheritedFilters,
            ...(dateFilter ? [dateFilter] : []),
          ],
        };
      }),
      keys: list.map((chart) => chartFetchKey(
        chart, inheritedFilters, dataRevision, dateFilterForChart(chart, columnTypeByKey, dateRange),
      )),
    };
  }, [charts, inheritedFilters, dataRevision, columnTypeByKey, dateRange]);

  const payloadKey = useMemo(
    () => JSON.stringify({ ids: payload.ids, keys: payload.keys, boardKey }),
    [payload, boardKey],
  );

  const loading = useMemo(() => Object.values(loadingById).some(Boolean), [loadingById]);

  // Instant paint: seed gecachte series zodra de set charts/keys wijzigt.
  useEffect(() => {
    if (!payload.ids.length) return;
    const seeded = {};
    payload.ids.forEach((id, index) => {
      const cached = getBiSeries(payload.keys[index]);
      if (cached !== undefined) seeded[String(id)] = cached;
    });
    if (Object.keys(seeded).length) setResultsById((prev) => ({ ...prev, ...seeded }));
  }, [payloadKey, payload]);

  // Lichtgewicht revision-check (alleen BiPage): leegt de cache als het board is gewijzigd.
  // `revisionNonce` laat de check opnieuw draaien bij keep-alive-terugkeer (component blijft
  // gemount). We zetten revisionReady eerst op false zodat de fetch-effect na een eventuele
  // cache-leging opnieuw evalueert; is de revisie ongewijzigd, dan blijft de cache staan (instant).
  useEffect(() => {
    if (!checkRevision) return undefined;
    let active = true;
    setRevisionReady(false);
    apiRequest(`/bi/revision/${boardKey}`)
      .then((data) => { if (active) setBiRevision(data?.revision ?? null); })
      .catch(() => { /* val terug op fetch */ })
      .finally(() => { if (active) setRevisionReady(true); });
    return () => { active = false; };
  }, [checkRevision, boardKey, revisionNonce]);

  // Haal alleen de charts op die (nog) niet in de cache staan.
  useEffect(() => {
    if (!revisionReady || !payload.charts.length) return undefined;

    const dirtyCharts = [];
    const dirtyMeta = [];
    payload.ids.forEach((id, index) => {
      const key = payload.keys[index];
      if (getBiSeries(key) === undefined) { dirtyCharts.push(payload.charts[index]); dirtyMeta.push({ id, key }); }
    });
    if (!dirtyMeta.length) return undefined;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoadingById((prev) => {
      const next = { ...prev };
      dirtyMeta.forEach(({ id }) => { next[String(id)] = true; });
      return next;
    });
    setError(null);

    apiRequest('/bi/aggregate', { method: 'POST', body: { boardKey, charts: dirtyCharts } })
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setResultsById((prev) => {
          const next = { ...prev };
          (data.results || []).forEach((result, index) => {
            const meta = dirtyMeta[index];
            if (!meta) return;
            const series = result.series || [];
            next[String(meta.id)] = series;
            setBiSeries(meta.key, series);
          });
          return next;
        });
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) setError(err.message || 'Failed to load chart data');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoadingById((prev) => {
          const next = { ...prev };
          dirtyMeta.forEach(({ id }) => { next[String(id)] = false; });
          return next;
        });
      });

    return undefined;
  }, [revisionReady, payloadKey, payload, boardKey]);

  useEffect(() => {
    if (!payload.charts.length) { setResultsById({}); setLoadingById({}); }
  }, [payload.charts.length]);

  return useMemo(
    () => ({ resultsById, loadingById, loading, error }),
    [resultsById, loadingById, loading, error],
  );
}
