// Warmt biBoardCache op de achtergrond met dezelfde vendor-/datumfilter en dezelfde chartFetchKey
// die useChartData straks zal gebruiken zodra de gebruiker /bi opent. Zonder die parity bouwt de
// prefetch een cache-key die de echte lezing nooit raakt — dan is dit hele bestand verspilde
// server-load. Zie docs/specs/2026-08-26-idle-prefetch-kpi-bi-rccp-design.md.
//
// Vendor-resolutie gebeurt bewust NIET hier: dataPagesPrefetch.js haalt /rccp/vendors één keer op
// en resolvet zowel de RCCP- als de BI-vendor daaruit (elk met hun eigen prioriteitsregel), zodat
// deze module niet nog een keer dezelfde /rccp/vendors-call hoeft te doen.
import { apiRequest } from './api';
import { isoWindowDateRange } from '../components/rccp/rccpUtils';
import { BOARD_KEY } from '../components/bi/biConstants';
import { loadBiCharts, loadBiMeta, setBiSeries, setBiRevision } from './biBoardCache';
import { chartFetchKey, dateFilterForChart, filtersFromColumnMap } from './biChartFetchKey';

const MAX_CHARTS = 20;

async function resolveDateRange() {
  const data = await apiRequest('/bi/date-filter');
  const filter = data?.dateFilter;
  if (!filter?.enabled || !filter.isoWindow) return null;
  return isoWindowDateRange(filter.isoWindow);
}

/**
 * @param {{ externalFilterByColumn?: object }} [params] Zelfde shape als `useBiVendorFilter`'s
 *   `externalFilterByColumn` (`{ [vendorColumnKey]: { operator: 'equals', value } }`), of
 *   `undefined` voor "alle vendors" (of een supplier — de server forceert dan toch hun scope).
 */
export async function prefetchBiDashboard({ externalFilterByColumn } = {}) {
  const [dateRange, metaData, charts] = await Promise.all([
    resolveDateRange().catch(() => null),
    loadBiMeta(BOARD_KEY, () => apiRequest(`/bi/meta/${BOARD_KEY}`)).catch(() => null),
    loadBiCharts(() => apiRequest('/bi/charts')).catch(() => null),
  ]);

  const list = Array.isArray(charts) ? charts.slice(0, MAX_CHARTS) : [];
  if (!list.length) return;

  const columnTypeByKey = {};
  (metaData?.columns || []).forEach((col) => { if (col?.key) columnTypeByKey[col.key] = col.dataType; });

  const inheritedFilters = filtersFromColumnMap(externalFilterByColumn);
  const chartDateFilters = list.map((chart) => dateFilterForChart(chart, columnTypeByKey, dateRange));

  const aggregateCharts = list.map((chart, index) => ({
    ...chart.config,
    filters: [
      ...(chart.config?.filters || []),
      ...inheritedFilters,
      ...(chartDateFilters[index] ? [chartDateFilters[index]] : []),
    ],
  }));

  const data = await apiRequest('/bi/aggregate', {
    method: 'POST',
    body: { boardKey: BOARD_KEY, charts: aggregateCharts },
  });

  setBiRevision(data?.revision ?? null);
  (data?.results || []).forEach((result, index) => {
    const chart = list[index];
    if (!chart) return;
    const key = chartFetchKey(chart, inheritedFilters, null, chartDateFilters[index]);
    setBiSeries(key, result.series || []);
  });
}
