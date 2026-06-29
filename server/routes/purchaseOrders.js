'use strict';

// Routes voor het SQL-backed Purchase-Orders-scherm (Fase 1, #AB:132).
// Gemonteerd op /api/purchase-orders achter requireSession + medewerker/admin-rol (zie server.js).
// Lezen gaat altijd uit de SQL-cache; D365 wordt alleen geraadpleegd via /refresh of lazy refresh.

const express = require('express');
const cacheService = require('../services/D365PurchaseOrderCacheService');
const columnsService = require('../services/PurchaseOrderColumnsService');

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
    const data = await cacheService.read();
    return res.json({ ...data, refreshed, refreshError });
  } catch (err) {
    return next(err);
  }
});

// POST /api/purchase-orders/refresh — forceer een D365-refresh.
router.post('/refresh', async (req, res, next) => {
  try {
    const summary = await cacheService.refresh();
    const data = await cacheService.read();
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

module.exports = router;
