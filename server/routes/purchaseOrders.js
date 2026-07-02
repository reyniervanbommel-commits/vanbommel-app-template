'use strict';

// Routes voor het SQL-backed Purchase-Orders-scherm (Fase 1, #AB:132).
// Gemonteerd op /api/purchase-orders achter requireSession + medewerker/admin-rol (zie server.js).
// Lezen gaat altijd uit de SQL-cache; D365 wordt alleen geraadpleegd via /refresh of lazy refresh.

const express = require('express');
const cacheService = require('../services/D365PurchaseOrderCacheService');
const columnsService = require('../services/PurchaseOrderColumnsService');
const settingsService = require('../services/SettingsService');
const { compileSyncRules, parseSyncRules, OPERATORS, MAX_RULES } = require('../utils/odataSyncFilter');
const { requireAnyRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

function toColumnId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
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

// DELETE /api/purchase-orders/columns/:id — soft-delete (waarden blijven behouden).
router.delete('/columns/:id', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const result = await columnsService.deactivateColumn(columnId, req.user.id);
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
    const [baseUrl, headerPath, company, columns, stats, rulesJson, rawFilter] = await Promise.all([
      settingsService.getAsync('D365_ODATA_BASE_URL', ''),
      settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH', '/data/PurchaseOrderHeadersV2'),
      settingsService.getAsync('D365_ODATA_COMPANY', ''),
      columnsService.listColumns({ includeInactive: true }),
      cacheService.getCacheStats().catch(() => null),
      settingsService.getAsync('PO_SYNC_RULES', ''),
      settingsService.getAsync('PO_SYNC_FILTER', ''),
    ]);

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
        rawFilter: rawFilter.trim(),
        operators: OPERATORS,
        maxRules: MAX_RULES,
      },
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

    // Alleen velden toestaan die als D365 header-kolom bekend zijn in de registry.
    const headerColumns = await columnsService.listColumns({ level: 'header', includeInactive: true });
    const allowedFields = new Set(headerColumns.filter((c) => c.source === 'd365' && c.d365Field).map((c) => c.d365Field));
    for (const rule of rules) {
      if (!allowedFields.has(String(rule?.field || ''))) {
        return res.status(400).json({ error: `Onbekend D365-veld: ${rule?.field || '(leeg)'}` });
      }
    }

    const compiled = compileSyncRules(rules); // gooit 400 bij ongeldige regels
    await settingsService.set('PO_SYNC_RULES', JSON.stringify(rules), req.user.id);
    return res.json({ rules, compiled });
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
