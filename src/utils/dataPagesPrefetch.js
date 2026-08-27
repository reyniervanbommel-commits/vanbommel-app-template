// Orchestreert het achtergrondwerk dat ná board-idle de KPI-tab, RCCP en BI alvast warm maakt.
// KPI, RCCP en BI lopen naast elkaar: een trage of falende board-kpis-call mag de eerste klik
// op /rccp of /bi niet meer blokkeren. Elke stap faalt stil: een mislukte prefetch mag nooit
// een toast/spinner op de PO-tabel veroorzaken; tab-open of paginanavigatie valt terug op de
// bestaande, normale fetch.
import { getPoBoardKpis } from './poBoardKpiCache';
import { prefetchRccpAnalysis } from './rccpAnalysisPrefetch';
import { prefetchBiDashboard } from './biBoardPrefetch';
import { apiRequest } from './api';
import { readPoFilterByColumnForRccp } from './poVendorFilterHandoff';
import {
  resolveDefaultRccpVendor,
  resolveDefaultRccpVendorWithFallback,
} from '../components/rccp/resolveRccpVendorFilter';

let inFlightKey = '';
let inFlight = null;
let latestParams = null;

/**
 * De PO-pagina (via useDataPagesPrefetch) roept dit op elke render aan zodat de rail-hover
 * (AppLayout, buiten de PO-pagina) de prefetch met dezelfde parameters kan starten zonder zelf
 * board-data (dataRevision/vendor/window) te hoeven kennen.
 */
export function setDataPagesPrefetchParams(params) {
  latestParams = params && params.refreshKey ? params : null;
}

/** Rail-hover: start meteen (geen idle-wacht) met de laatst bekende PO-pagina-parameters. Geen
 * effect als de PO-pagina deze sessie nog niet is geladen. */
export function kickDataPagesPrefetch() {
  if (!latestParams) return undefined;
  return startDataPagesPrefetch(latestParams);
}

export function preloadDataPageChunks() {
  return Promise.all([
    import('../components/rccp/RccpPage.jsx'),
    import('../components/bi/BiPage.jsx'),
  ]).catch(() => {});
}

/**
 * Eén /rccp/vendors-call, hergebruikt om zowel de RCCP- als de BI-vendor te resolven — elk met
 * hun eigen prioriteitsregel, want die zijn NIET gelijk:
 * - RCCP (RccpPageContent.jsx): PO-tabelfilter wint, anders lastVendor, anders leeg.
 * - BI (useBiVendorFilter.js): alleen PO-tabelfilter, geen lastVendor-fallback.
 * Zonder dit hergebruikt dataPagesPrefetch alleen `lastVendor` voor RCCP — dat wijkt af zodra de
 * gebruiker een vendor-kolomfilter op het PO-board heeft staan, met een permanente cache-miss
 * (en dus geen enkel prefetch-voordeel) tot gevolg.
 */
async function resolveVendorScope({ isSupplier, lastVendor }) {
  if (isSupplier) return { rccpVendor: '', biExternalFilterByColumn: undefined };
  const vendorsData = await apiRequest('/rccp/vendors');
  const vendors = Array.isArray(vendorsData?.vendors) ? vendorsData.vendors : [];
  const vendorNames = vendorsData?.vendorNames || {};
  const vendorColumnKey = vendorsData?.vendorColumnKey || '';
  const filterByColumn = readPoFilterByColumnForRccp();

  const rccpVendor = resolveDefaultRccpVendorWithFallback({
    vendors, vendorNames, filterByColumn, vendorColumnKey, lastVendor, lastVendorReady: true,
  }) || '';

  const biVendor = resolveDefaultRccpVendor({
    vendors, vendorNames, filterByColumn, vendorColumnKey,
  });
  const biExternalFilterByColumn = biVendor && vendorColumnKey
    ? { [vendorColumnKey]: { operator: 'equals', value: biVendor } }
    : undefined;

  return { rccpVendor, biExternalFilterByColumn };
}

/**
 * @param {{ refreshKey: string|number, lastVendor?: string, isoWindow?: object, isSupplier?: boolean }} params
 */
export function startDataPagesPrefetch({ refreshKey, lastVendor, isoWindow, isSupplier = false } = {}) {
  const key = String(refreshKey || '');
  if (inFlightKey === key) return inFlight;
  inFlightKey = key;
  inFlight = (async () => {
    const kpiPromise = getPoBoardKpis(refreshKey).catch(() => {});
    const chunksPromise = preloadDataPageChunks();
    let rccpVendor = '';
    let biExternalFilterByColumn;
    try {
      const scope = await resolveVendorScope({ isSupplier, lastVendor });
      rccpVendor = scope.rccpVendor;
      biExternalFilterByColumn = scope.biExternalFilterByColumn;
    } catch {
      /* stil — BI blijft all-vendors prefetchen */
    }
    if (rccpVendor && isoWindow) prefetchRccpAnalysis(isoWindow, rccpVendor);
    const biPromise = prefetchBiDashboard({
      externalFilterByColumn: biExternalFilterByColumn,
    }).catch(() => {});
    await Promise.all([kpiPromise, chunksPromise, biPromise]);
  })();
  return inFlight;
}
