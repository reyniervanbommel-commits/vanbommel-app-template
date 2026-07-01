'use strict';

// Admin-routes voor de Table Builder (#139, Fase B). Kaal gemonteerd op /api/admin (zie server.js);
// de admin-gate zit hier PER ROUTE via `adminOnly` (requireSession + requireRole('admin')), NIET op de
// mount. Zo blijven niet-matchende /api/admin/*-paden doorvallen naar de generieke admin-router zonder
// dat employees onterecht een 403 krijgen. Volgt het bestaande admin-stramien: try/catch -> next(err),
// audit-logging op elke schrijfactie, Nederlandse foutmeldingen.
//
// UI-navigatie (open beslissing §3.6): nieuwe tabellen verschijnen automatisch uit de dynamische lijst
// van tb_tables (GET /api/admin/tables + de gebruikers-API GET /api/data/:tableKey). Er is geen
// hardcoded menu-plek; de frontend rendert de tabellenlijst data-gedreven.

const express = require('express');
const tableBuilder = require('../services/TableBuilderService');
const tableAssist = require('../services/TableAssistService');
const { auditLog } = require('../middleware/auditLog');
const { requireSession, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Admin-gate per route (zie header): geldt alleen op werkelijk gematchte Table-Builder-paden.
const adminOnly = [requireSession, requireRole(ROLES.ADMIN)];

function toId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// ─── Tabellen ────────────────────────────────────────────────────────────────

// GET /api/admin/tables?includeInactive=1
router.get('/tables', adminOnly, async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    const tables = await tableBuilder.listTables({ includeInactive });
    res.json({ tables });
  } catch (err) { next(err); }
});

// POST /api/admin/tables — nieuwe tabel-definitie.
router.post('/tables', adminOnly, async (req, res, next) => {
  try {
    const table = await tableBuilder.createTable(req.body || {}, req.user.id);
    await auditLog(req.user.id, req.user.email, 'CREATE_TABLE', 'tb_tables', table.id, { key: table.key });
    res.status(201).json({ table });
  } catch (err) { next(err); }
});

// GET /api/admin/tables/:id — één tabel + relatie + kolommen.
router.get('/tables/:id', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const table = await tableBuilder.getTable(id);
    res.json({ table });
  } catch (err) { next(err); }
});

// PATCH /api/admin/tables/:id — tabel-definitie bijwerken.
router.patch('/tables/:id', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const table = await tableBuilder.updateTable(id, req.body || {}, req.user.id);
    await auditLog(req.user.id, req.user.email, 'UPDATE_TABLE', 'tb_tables', id, req.body || {});
    res.json({ table });
  } catch (err) { next(err); }
});

// DELETE /api/admin/tables/:id — soft-delete (deactiveren).
router.delete('/tables/:id', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const result = await tableBuilder.deactivateTable(id, req.user.id);
    await auditLog(req.user.id, req.user.email, 'DEACTIVATE_TABLE', 'tb_tables', id, {});
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Bronnen ─────────────────────────────────────────────────────────────────

// GET /api/admin/sources
router.get('/sources', adminOnly, async (req, res, next) => {
  try {
    const sources = await tableBuilder.listSources();
    res.json({ sources });
  } catch (err) { next(err); }
});

// GET /api/admin/sources/:id/entities?q=&limit= — beschikbare entiteiten voor de entiteit-picker.
router.get('/sources/:id/entities', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig bron-id' });
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = req.query.limit;
    const result = await tableBuilder.discoverEntities(id, { q, limit });
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/admin/sources/:id/test — verbindingstest via de provider.
router.post('/sources/:id/test', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig bron-id' });
    const result = await tableBuilder.testSource(id);
    await auditLog(req.user.id, req.user.email, 'TEST_SOURCE', 'tb_sources', id, { ok: result.ok });
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Velddiscovery + kolommen cureren ─────────────────────────────────────────

// GET /api/admin/tables/:id/discover?detailSourceEntity=... — kandidaatvelden (master + detail).
// Met detailSourceEntity ontdekt de frontend detail-velden VÓÓRDAT de relatie is opgeslagen; zonder
// param geldt het bestaande gedrag (gebruik de opgeslagen relatie).
router.get('/tables/:id/discover', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const detailSourceEntity = typeof req.query.detailSourceEntity === 'string'
      ? req.query.detailSourceEntity : undefined;
    const fields = await tableBuilder.discoverFields(id, { detailSourceEntity });
    res.json({ fields });
  } catch (err) { next(err); }
});

// GET /api/admin/tables/:id/columns — de al gecureerde/aanwezige kolommen (master + detail).
router.get('/tables/:id/columns', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const table = await tableBuilder.getTable(id);
    res.json({ columns: table.columns });
  } catch (err) { next(err); }
});

// POST /api/admin/tables/:id/columns — bronvelden cureren (kiezen + labelen + typeren).
router.post('/tables/:id/columns', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const columns = req.body && Array.isArray(req.body.columns) ? req.body.columns : req.body;
    const saved = await tableBuilder.curateColumns(id, columns, req.user.id);
    await auditLog(req.user.id, req.user.email, 'CURATE_COLUMNS', 'tb_columns', id, { aantal: saved.length });
    res.status(201).json({ columns: saved });
  } catch (err) { next(err); }
});

// ─── AI-authoring-assistent ───────────────────────────────────────────────────

// POST /api/admin/tables/assist — laat de AI-assistent een entiteit + velden voorstellen.
// Body: { sourceId, prompt }. Zonder ANTHROPIC_API_KEY -> 503 met code 'AI_NOT_CONFIGURED'.
// LET OP: geen volledige prompt in de audit-payload (kan gevoelige inhoud bevatten); alleen lengte.
router.post('/tables/assist', adminOnly, async (req, res, next) => {
  try {
    const body = req.body || {};
    const sourceId = toId(body.sourceId);
    if (!sourceId) return res.status(400).json({ error: 'Ongeldig bron-id (sourceId)' });
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';

    await auditLog(req.user.id, req.user.email, 'TABLE_ASSIST', 'tb_tables', sourceId, {
      promptLength: prompt.length,
    });
    const result = await tableAssist.suggest({ sourceId, prompt });
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Master-detail-relatie ────────────────────────────────────────────────────

// GET /api/admin/tables/:id/relations — relatie-kandidaten (nav-properties) zodat de admin KIEST i.p.v. typt.
router.get('/tables/:id/relations', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const result = await tableBuilder.discoverRelations(id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/admin/tables/:id/relation/suggest — Claude stelt de logische detail-relatie voor.
// Zonder ANTHROPIC_API_KEY -> 503 met code 'AI_NOT_CONFIGURED'. Audit met alleen tableId.
router.post('/tables/:id/relation/suggest', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    await auditLog(req.user.id, req.user.email, 'RELATION_SUGGEST', 'tb_relations', id, {});
    const result = await tableAssist.suggestRelation({ tableId: id });
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/admin/tables/:id/relation — master-detail-relatie leggen/bijwerken.
router.post('/tables/:id/relation', adminOnly, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ongeldig tabel-id' });
    const relation = await tableBuilder.setRelation(id, req.body || {});
    await auditLog(req.user.id, req.user.email, 'SET_RELATION', 'tb_relations', id, req.body || {});
    res.json({ relation });
  } catch (err) { next(err); }
});

module.exports = router;
