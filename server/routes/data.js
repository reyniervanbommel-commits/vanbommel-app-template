'use strict';

// Generieke Table Builder-data-API (#AB:152, Fase A). Gemonteerd op /api/data achter requireSession +
// medewerker/admin-rol (zie server.js). tableKey-gedreven; lezen gaat uit tb_cache, bron alleen via refresh.
// Strangler-fig: dit pad staat NAAST /api/purchase-orders (dat blijft het bestaande PO-scherm voeden).

const express = require('express');
const dataService = require('../services/TableDataService');
const columnsService = require('../services/TableColumnsService');
const registry = require('../services/TableRegistryService');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

function toColumnId(raw) {
  if (!/^\d+$/.test(String(raw || '').trim())) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/data/:tableKey?autoRefresh=1 — lezen (lazy refresh bij stale cache).
router.get('/:tableKey', async (req, res, next) => {
  try {
    const { tableKey } = req.params;
    const autoRefresh = req.query.autoRefresh === '1' || req.query.autoRefresh === 'true';
    const canRefresh = req.user?.role === ROLES.ADMIN;
    let refreshed = false;
    let refreshError = null;
    if (autoRefresh && canRefresh && (await dataService.isStale(tableKey))) {
      try {
        await dataService.refresh(tableKey);
        refreshed = true;
      } catch (refreshErr) {
        refreshError = 'Verversen mislukt';
      }
    }
    const data = await dataService.read({ tableKey, userId: req.user.id });
    return res.json({ ...data, refreshed, refreshError });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/refresh — forceer een bron-refresh.
router.post('/:tableKey/refresh', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { tableKey } = req.params;
    const summary = await dataService.refresh(tableKey);
    const data = await dataService.read({ tableKey, userId: req.user.id });
    return res.json({ ...data, refresh: summary, refreshed: true });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/refresh/start — start refresh op de achtergrond.
router.post('/:tableKey/refresh/start', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { tableKey } = req.params;
    const result = await dataService.startRefresh(tableKey);
    return res.status(result.started ? 202 : 200).json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /api/data/:tableKey/refresh/progress — voortgang van de lopende/laatste bron-refresh.
router.get('/:tableKey/refresh/progress', async (req, res, next) => {
  try {
    const { tableKey } = req.params;
    return res.json({
      running: dataService.isRefreshRunning(tableKey),
      progress: dataService.getRefreshProgress(tableKey),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/viewed — markeer alles als gezien (admin baseline voor alle gebruikers).
router.post('/:tableKey/viewed', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const result = await dataService.markViewed(req.user.id, req.params.tableKey);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /api/data/:tableKey/columns?scope=&includeInactive=
router.get('/:tableKey/columns', async (req, res, next) => {
  try {
    const scope = req.query.scope ? String(req.query.scope) : null;
    if (scope && !registry.SCOPES.includes(scope)) {
      return res.status(400).json({ error: 'Ongeldige scope' });
    }
    const table = await registry.getTableByKey(req.params.tableKey);
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    const columns = await registry.listColumns({ tableId: table.id, scope, includeInactive });
    return res.json({ columns });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/columns — app-native kolom toevoegen.
router.post('/:tableKey/columns', async (req, res, next) => {
  try {
    const { scope, label, dataType, options, formulaExpr } = req.body || {};
    const column = await columnsService.createColumn(
      { tableKey: req.params.tableKey, scope, label, dataType, options, formulaExpr },
      req.user.id,
    );
    return res.status(201).json({ column });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/columns/validate-formula — valideer formule + refs zonder opslaan.
router.post('/:tableKey/columns/validate-formula', async (req, res, next) => {
  try {
    const table = await registry.getTableByKey(req.params.tableKey);
    const ownColumnKey = String(req.body?.ownColumnKey || '').trim();
    const resultType = String(req.body?.dataType || 'number').trim() || 'number';
    const normalized = columnsService.normalizeFormulaExpression(req.body?.formulaExpr);
    if (!normalized.expression) {
      return res.status(400).json({ error: 'Formule is verplicht' });
    }
    const masterColumns = await registry.listColumns({ tableId: table.id, scope: 'master', includeInactive: false });
    columnsService.validateFormulaReferences(normalized.references, masterColumns, ownColumnKey);
    columnsService.validateFormulaResultTypeCompatibility(
      normalized.expression,
      normalized.references,
      masterColumns,
      resultType
    );
    return res.json({
      valid: true,
      normalizedExpression: normalized.expression,
      references: normalized.references,
    });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/data/:tableKey/columns/:id — app-native kolom hernoemen.
router.patch('/:tableKey/columns/:id', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const hasFormulaPayload = req.body && (
      Object.prototype.hasOwnProperty.call(req.body, 'formulaExpr')
      || Object.prototype.hasOwnProperty.call(req.body, 'dataType')
    );
    const hasOptionsPayload = req.body && Object.prototype.hasOwnProperty.call(req.body, 'options');
    const column = hasFormulaPayload
      ? await columnsService.updateFormulaColumn(
        columnId,
        {
          label: req.body?.label,
          dataType: req.body?.dataType,
          formulaExpr: req.body?.formulaExpr,
        },
        req.user.id,
      )
      : hasOptionsPayload
        ? await columnsService.updateColumn(
          columnId,
          { label: req.body?.label, options: req.body?.options },
          req.user.id,
        )
        : await columnsService.renameColumn(columnId, req.body?.label, req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/data/:tableKey/columns/:id — soft-delete (waarden blijven behouden).
router.delete('/:tableKey/columns/:id', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const result = await columnsService.deactivateColumn(columnId, req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/data/:tableKey/columns/:id/visibility — kolom tonen/verbergen op het bord (is_active). #AB:170
router.patch('/:tableKey/columns/:id/visibility', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.setColumnVisibility(columnId, Boolean(req.body?.visible), req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/data/:tableKey/columns/:id/visible-at-delete — zichtbaar in de verborgen-orders-popup. #AB:170
router.patch('/:tableKey/columns/:id/visible-at-delete', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.setVisibleAtDelete(columnId, Boolean(req.body?.visible), req.user.id);
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/data/:tableKey/columns/:id/writeback — write-back-config (writable + mechanisme). #AB:170
router.patch('/:tableKey/columns/:id/writeback', async (req, res, next) => {
  try {
    const columnId = toColumnId(req.params.id);
    if (!columnId) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const column = await columnsService.setWriteBackConfig(
      columnId,
      { writable: req.body?.writable, mechanism: req.body?.mechanism },
      req.user.id,
    );
    return res.json({ column });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/data/:tableKey/value — app-native kolomwaarde opslaan (instant).
router.put('/:tableKey/value', async (req, res, next) => {
  try {
    const { columnId, partitionKey, recordKey, detailKey, value } = req.body || {};
    const id = toColumnId(columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const saved = await dataService.saveCustomValue(
      { tableKey: req.params.tableKey, columnId: id, partitionKey, recordKey, detailKey, value },
      req.user.id,
    );
    return res.json({ success: true, ...saved });
  } catch (err) {
    return next(err);
  }
});

// GET /api/data/:tableKey/datamodel — admin: entiteiten, relatie, kolommen, cache-stats, sync-filter. #AB:175
router.get('/:tableKey/datamodel', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    return res.json(await dataService.getDataModel(req.params.tableKey));
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/discover-fields — admin: ontdek alle beschikbare bronvelden (kleine sample,
// geen cache-write) en registreer nieuwe velden als beschikbare (inactieve) kolommen om te kiezen. #AB:177
router.post('/:tableKey/discover-fields', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    return res.json(await dataService.discoverSourceFields(req.params.tableKey));
  } catch (err) {
    return next(err);
  }
});

// PUT /api/data/:tableKey/sync-filters — admin: gestructureerde D365-syncfilterregels opslaan. #AB:174
router.put('/:tableKey/sync-filters', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    return res.json(await dataService.saveSyncFilters(req.params.tableKey, req.body?.rules));
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/sync-filters/count — admin: tel hoeveel bron-rijen de filter matcht. #AB:174
router.post('/:tableKey/sync-filters/count', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    return res.json(await dataService.countSyncFilter(req.params.tableKey, req.body?.rules));
  } catch (err) {
    return next(err);
  }
});

// GET /api/data/:tableKey/history?columnId=&partitionKey=&recordKey=&detailKey= — cel-geschiedenis. #AB:173
router.get('/:tableKey/history', async (req, res, next) => {
  try {
    const id = toColumnId(req.query.columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const history = await dataService.getCellHistory({
      tableKey: req.params.tableKey,
      columnId: id,
      partitionKey: req.query.partitionKey,
      recordKey: req.query.recordKey,
      detailKey: req.query.detailKey,
    });
    return res.json({ history });
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/correct — D365-veldcorrectie terugschrijven (write-back). #AB:172
router.post('/:tableKey/correct', async (req, res, next) => {
  try {
    const { columnId, partitionKey, recordKey, detailKey, value, basedOnValue } = req.body || {};
    const id = toColumnId(columnId);
    if (!id) return res.status(400).json({ error: 'Ongeldig kolom-id' });
    const result = await dataService.correctField(
      { tableKey: req.params.tableKey, columnId: id, partitionKey, recordKey, detailKey, value, basedOnValue },
      req.user.id,
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/rows/exclude — bulk "verwijderen" (persistente exclusion). #AB:171
router.post('/:tableKey/rows/exclude', async (req, res, next) => {
  try {
    const result = await dataService.excludeRows(
      { tableKey: req.params.tableKey, rows: req.body?.rows },
      req.user.id,
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /api/data/:tableKey/rows/hidden-in-filter — verborgen rijen die nog binnen de bron-scope vallen. #AB:171
router.get('/:tableKey/rows/hidden-in-filter', async (req, res, next) => {
  try {
    const result = await dataService.listHiddenInFilterRows(req.params.tableKey);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/data/:tableKey/rows/include — "terugzetten": hef de exclusion op. #AB:171
router.post('/:tableKey/rows/include', async (req, res, next) => {
  try {
    const result = await dataService.includeRows(
      { tableKey: req.params.tableKey, rows: req.body?.rows },
      req.user.id,
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
