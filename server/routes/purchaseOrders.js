'use strict';

// Routes voor het SQL-backed Purchase-Orders-scherm (Fase 1, #AB:132).
// Gemonteerd op /api/purchase-orders achter requireSession + medewerker/admin-rol (zie server.js).
// Lezen gaat altijd uit de SQL-cache; D365 wordt alleen geraadpleegd via /refresh of lazy refresh.

const express = require('express');
const cacheService = require('../services/D365PurchaseOrderCacheService');
const columnsService = require('../services/PurchaseOrderColumnsService');
const settingsService = require('../services/SettingsService');
const { fetchPurchaseOrders } = require('../services/D365ODataService');
const { compileSyncRules, parseSyncRules, OPERATORS, MAX_RULES } = require('../utils/odataSyncFilter');
const { buildAllowedSyncFilterFields, normalizeLevel } = require('../utils/syncFilterCatalog');
const { requireAnyRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

function toColumnId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function validateSyncRulesAgainstCatalog(rules) {
  const [filterMeta, columns] = await Promise.all([
    cacheService.getFilterFieldCatalogAndPreview(),
    columnsService.listColumns({ includeInactive: true }),
  ]);
  const allowedFields = buildAllowedSyncFilterFields(filterMeta, columns);
  if (!allowedFields.size && rules.length) {
    throw Object.assign(new Error('Nog geen filtervelden met data beschikbaar. Voer eerst een sync uit.'), { status: 400 });
  }
  for (const rule of rules) {
    const level = normalizeLevel(rule?.level) || 'header';
    const field = String(rule?.field || '').trim();
    if (!allowedFields.has(`${level}|${field}`)) {
      throw Object.assign(new Error(`Onbekend of leeg veld in cache: ${level}.${field || '(leeg)'}`), { status: 400 });
    }
  }
}

// GET /api/purchase-orders?autoRefresh=1
// Lazy refresh: ververst alleen wanneer de cache stale is en autoRefresh meegegeven is.
router.get('/', async (req, res, next) => {
  try {
    const autoRefresh = req.query.autoRefresh === '1' || req.query.autoRefresh === 'true';
    let refreshed = false;
    let refreshError = null;
    if (autoRefresh && (await cacheService.isStale())) {
      try {
        await cacheService.refresh();
        refreshed = true;
      } catch (refreshErr) {
        // Een mislukte lazy refresh (bv. D365 niet geconfigureerd) mag het lezen niet blokkeren:
        // toon de (mogelijk lege) cache met een melding i.p.v. een 500.
        refreshError = refreshErr.message || 'Verversen mislukt';
      }
    }
    const data = await cacheService.read({ userId: req.user.id });
    return res.json({ ...data, refreshed, refreshError });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/viewed — markeer alles als gezien (reset nieuw/gewijzigd voor deze gebruiker).
router.post('/viewed', async (req, res, next) => {
  try {
    const result = await cacheService.markViewed(req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/refresh — forceer een D365-refresh.
router.post('/refresh', async (req, res, next) => {
  try {
    const summary = await cacheService.refresh();
    const data = await cacheService.read({ userId: req.user.id });
    return res.json({ ...data, refresh: summary, refreshed: true });
  } catch (err) {
    return next(err);
  }
});

// GET /api/purchase-orders/refresh/progress — voortgang van de lopende/laatste D365-refresh.
router.get('/refresh/progress', async (_req, res, next) => {
  try {
    return res.json({ progress: cacheService.getRefreshProgress() });
  } catch (err) {
    return next(err);
  }
});

// GET /api/purchase-orders/columns?level=&includeInactive=
router.get('/columns', async (req, res, next) => {
  try {
    const level = req.query.level ? String(req.query.level) : null;
    if (level && !columnsService.LEVELS.includes(level)) {
      return res.status(400).json({ error: 'Ongeldig niveau' });
    }
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    const columns = await columnsService.listColumns({ level, includeInactive });
    return res.json({ columns });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/columns — eigen kolom toevoegen.
router.post('/columns', async (req, res, next) => {
  try {
    const { label, level, dataType, options } = req.body || {};
    const column = await columnsService.createColumn({ label, level, dataType, options }, req.user.id);
    return res.status(201).json({ column });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/purchase-orders/columns/:id — eigen kolom hernoemen.
router.patch('/columns/:id', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.renameColumn(columnId, req.body?.label, req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/purchase-orders/columns/:id — hard-delete (kolom + gerelateerde SQL-data).
router.delete('/columns/:id', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const result = await columnsService.deleteColumn(columnId, req.user);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/purchase-orders/values — eigen kolomwaarde opslaan (instant).
// Body via natuurlijke sleutel i.p.v. path-params, omdat PO-nummers tekens kunnen bevatten.
router.put('/values', async (req, res, next) => {
  try {
    const { columnId, dataAreaId, orderNumber, lineNumber, value } = req.body || {};
    const id = toColumnId(columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const saved = await cacheService.saveCustomValue(
      { columnId: id, dataAreaId, orderNumber, lineNumber, value },
      req.user.id,
    );
    return res.json({ success: true, ...saved });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/rows/exclude — bulk "verwijderen" van rijen uit het overzicht.
// Zet een persistente exclusion (SQL-only): geen D365-mutatie, en de rij komt niet terug bij
// een volgende synchronisatie. Body: { rows: [{ dataAreaId, orderNumber }, ...] }.
router.post('/rows/exclude', async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const result = await cacheService.excludeRows(rows, req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/purchase-orders/rows/hidden-in-filter — verborgen rijen die nog binnen de harde
// D365-filter vallen (verwijderd, maar D365 levert ze bij de laatste sync nog steeds op).
router.get('/rows/hidden-in-filter', async (_req, res, next) => {
  try {
    const result = await cacheService.listHiddenInFilterRows();
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/rows/include — "terugzetten": hef de exclusion op zodat de rijen
// weer in het overzicht verschijnen. Body: { rows: [{ dataAreaId, orderNumber }, ...] }.
router.post('/rows/include', async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const result = await cacheService.includeRows(rows);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/purchase-orders/history — cel-geschiedenis (audit trail) van één cel.
// Verenigt eigen-kolom-edits (po_cell_history) met D365-correcties (po_field_corrections).
router.get('/history', async (req, res, next) => {
  try {
    const id = toColumnId(req.query.columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const { dataAreaId, orderNumber } = req.query;
    const lineNumber = req.query.lineNumber !== undefined && req.query.lineNumber !== ''
      ? Number.parseInt(req.query.lineNumber, 10)
      : null;
    const history = await cacheService.getCellHistory({
      columnId: id, dataAreaId, orderNumber, lineNumber,
    });
    return res.json({ history });
  } catch (err) {
    return next(err);
  }
});

// GET /api/purchase-orders/datamodel — admin: entiteiten, relatie, kolommen (incl. verborgen) en cache-stats.
// De entiteit-structuur is bewust hier gedefinieerd (single source of truth voor de admin-UI):
// de app haalt PurchaseOrderHeadersV2 op met $expand=PurchaseOrderLines (zie D365ODataService).
router.get('/datamodel', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const [baseUrl, headerPath, company, stats, rulesJson, filterMeta] = await Promise.all([
      settingsService.getAsync('D365_ODATA_BASE_URL', ''),
      settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH', '/data/PurchaseOrderHeadersV2'),
      settingsService.getAsync('D365_ODATA_COMPANY', ''),
      cacheService.getCacheStats().catch(() => null),
      settingsService.getAsync('PO_SYNC_RULES', ''),
      cacheService.getFilterFieldCatalogAndPreview().catch(() => ({ catalog: { header: [], line: [] }, preview: null })),
    ]);
    const columns = await columnsService.listColumns({ includeInactive: true });

    const syncRules = parseSyncRules(rulesJson);
    let compiledFilter = '';
    try {
      compiledFilter = compileSyncRules(syncRules);
    } catch {
      compiledFilter = '';
    }

    return res.json({
      entities: [
        {
          id: 'header',
          name: 'PurchaseOrderHeadersV2',
          title: 'Purchase Order Headers',
          path: headerPath.trim() || '/data/PurchaseOrderHeadersV2',
          keys: ['dataAreaId', 'PurchaseOrderNumber'],
          cacheTable: 'po_cache_headers',
        },
        {
          id: 'line',
          name: 'PurchaseOrderLinesV2',
          title: 'Purchase Order Lines',
          path: '/data/PurchaseOrderLinesV2',
          expandedVia: 'PurchaseOrderLines',
          keys: ['dataAreaId', 'PurchaseOrderNumber', 'LineNumber'],
          cacheTable: 'po_cache_lines',
        },
      ],
      relation: {
        from: 'header',
        to: 'line',
        cardinality: '1:n',
        onFields: ['dataAreaId', 'PurchaseOrderNumber'],
        description: 'One order header has multiple order lines; fetched in a single call via $expand=PurchaseOrderLines.',
      },
      connection: {
        baseUrl: baseUrl.trim() || null,
        company: company.trim() || null,
      },
      columns: {
        header: columns.filter((c) => c.level === 'header'),
        line: columns.filter((c) => c.level === 'line'),
      },
      cache: stats,
      syncFilter: {
        rules: syncRules,
        compiled: compiledFilter,
        operators: OPERATORS,
        maxRules: MAX_RULES,
        templates: [
          {
            id: 'open_orders',
            label: 'Open orders',
            rules: [{ level: 'header', field: 'PurchaseOrderStatus', operator: 'eq', valueType: 'enum', enumType: 'PurchStatus', value: 'Backorder' }],
          },
          {
            id: 'received_orders',
            label: 'Received orders',
            rules: [{ level: 'header', field: 'PurchaseOrderStatus', operator: 'eq', valueType: 'enum', enumType: 'PurchStatus', value: 'Received' }],
          },
        ],
      },
      filterCatalog: filterMeta.catalog,
      previewTables: filterMeta.preview,
    });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/purchase-orders/sync-filters — admin: gestructureerde D365-syncfilterregels opslaan.
// De regels worden server-side gevalideerd + gecompileerd naar OData $filter; filteren gebeurt
// dus in de call naar D365 zelf (minder data ophalen, minder load op D365 en op de sync).
router.put('/sync-filters', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];

    await validateSyncRulesAgainstCatalog(rules);

    const compiled = compileSyncRules(rules); // gooit 400 bij ongeldige regels
    await settingsService.set('PO_SYNC_RULES', JSON.stringify(rules), req.user.id);
    return res.json({ rules, compiled });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/sync-filters/count — admin: tel hoeveel header-rijen de filter matcht in D365.
// Gebruikt dezelfde filterregels als de sync; ideaal om de impact te zien vóór je ververst.
router.post('/sync-filters/count', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    await validateSyncRulesAgainstCatalog(rules);
    const compiled = compileSyncRules(rules);
    const result = await fetchPurchaseOrders({
      supplierAccount: null,
      top: 1,
      skip: 0,
      fetchAll: false,
      extraFilter: compiled,
      maxItems: 1,
    });
    return res.json({ total: Number(result.total) || 0, compiled });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/purchase-orders/columns/:id/visibility — admin: toon/verberg een kolom in het PO-scherm.
router.patch('/columns/:id/visibility', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.setColumnVisibility(columnId, req.body?.visible, req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/purchase-orders/columns/:id/visible-at-delete — admin: toon/verberg een kolom in de
// "verborgen orders die nog in de D365-filter vallen"-popup (los van de tabelzichtbaarheid).
router.patch('/columns/:id/visible-at-delete', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.setColumnVisibleAtDelete(columnId, req.body?.visible, req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/purchase-orders/columns/:id/writeback — admin: zet write-back aan/uit per D365-kolom.
router.patch('/columns/:id/writeback', requireAnyRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const { writable, mechanism } = req.body || {};
    const column = await columnsService.setWriteBackConfig(columnId, { writable, mechanism });
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/correct — D365-veldcorrectie terugschrijven (write-back).
router.post('/correct', async (req, res, next) => {
  try {
    const { columnId, dataAreaId, orderNumber, lineNumber, value, basedOnValue } = req.body || {};
    const id = toColumnId(columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const result = await cacheService.correctField(
      { columnId: id, dataAreaId, orderNumber, lineNumber, value, basedOnValue },
      req.user.id,
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
