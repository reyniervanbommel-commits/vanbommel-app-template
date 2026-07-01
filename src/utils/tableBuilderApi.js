// API-client voor de admin TableBuilder-registry (User Story #139).
// Volgt exact het bestaande patroon van src/utils/api.js: session-cookie via
// `credentials: 'include'`, JSON body/headers, foutvorm `{ error: '<NL>' }`
// die door apiRequest naar een Error met .status/.data wordt vertaald.
// Alle endpoints zijn admin-only onder base /api/admin.
import { apiRequest } from './api';

// --- Tabellen ---------------------------------------------------------------

// GET /tables?includeInactive= → { tables: [...] }
export function listTables({ includeInactive = false } = {}) {
  const qs = includeInactive ? '?includeInactive=true' : '';
  return apiRequest(`/admin/tables${qs}`);
}

// POST /tables → 201 { table }
export function createTable(body) {
  return apiRequest('/admin/tables', { method: 'POST', body });
}

// GET /tables/:id → { table: { ..., relation, columns:{master,detail} } }
export function getTable(id) {
  return apiRequest(`/admin/tables/${id}`);
}

// PATCH /tables/:id (deelverzameling) → { table }
export function patchTable(id, body) {
  return apiRequest(`/admin/tables/${id}`, { method: 'PATCH', body });
}

// DELETE /tables/:id → { id, isActive:false } (soft-delete)
export function deleteTable(id) {
  return apiRequest(`/admin/tables/${id}`, { method: 'DELETE' });
}

// --- Bronnen ----------------------------------------------------------------

// GET /sources → { sources: [...] }
export function listSources() {
  return apiRequest('/admin/sources');
}

// POST /sources/:id/test → { ok, sourceId, providerType, capabilities, message }
export function testSource(id) {
  return apiRequest(`/admin/sources/${id}/test`, { method: 'POST' });
}

// GET /sources/:id/entities?q=&limit= → { entities:[{ name, sourceEntity, entityType }], total, truncated }
// Server-side zoeken door ~5163 entiteiten — stuur dus altijd een `q`.
export function discoverEntities(sourceId, { q = '', limit = 25 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiRequest(`/admin/sources/${sourceId}/entities${qs ? `?${qs}` : ''}`);
}

// --- AI-authoring-assistent -------------------------------------------------

// POST /tables/assist { sourceId, prompt } → { ok:true, suggestion:{ entitySet, sourceEntity, reason, fields:[{ scope, field, label }] } }
// Zonder AI-key antwoordt de backend met HTTP 503 en body { error, code:'AI_NOT_CONFIGURED' };
// die fout borrelt via apiRequest op als Error met .status=503 en .data.code.
export function assistTable({ sourceId, prompt }) {
  return apiRequest('/admin/tables/assist', { method: 'POST', body: { sourceId, prompt } });
}

// --- Velden ontdekken & kolommen -------------------------------------------

// GET /tables/:id/discover[?detailSourceEntity=<nav>] → { fields: [...] }
// Zonder detailSourceEntity worden alleen master-velden ontdekt. Mét een
// nav-property worden óók detail-velden ontdekt vóórdat de relatie is
// opgeslagen (fix #2: volgorde detail-velden). Zie handleDiscover in de wizard.
export function discoverFields(id, { detailSourceEntity } = {}) {
  const qs = detailSourceEntity
    ? `?detailSourceEntity=${encodeURIComponent(detailSourceEntity)}`
    : '';
  return apiRequest(`/admin/tables/${id}/discover${qs}`);
}

// GET /tables/:id/columns → { columns:{ master, detail } }
export function getColumns(id) {
  return apiRequest(`/admin/tables/${id}/columns`);
}

// POST /tables/:id/columns → 201 { columns: [...] }
export function saveColumns(id, columns) {
  return apiRequest(`/admin/tables/${id}/columns`, { method: 'POST', body: { columns } });
}

// --- Detail-relatie ---------------------------------------------------------

// POST /tables/:id/relation → { relation }
export function saveRelation(id, body) {
  return apiRequest(`/admin/tables/${id}/relation`, { method: 'POST', body });
}

// GET /tables/:id/relations → { relations:[{ name, targetEntityType, isCollection }] }
// Nav-property-kandidaten voor de detail-relatie. isCollection:true = master→N detail.
export function listRelations(id) {
  return apiRequest(`/admin/tables/${id}/relations`);
}

// POST /tables/:id/relation/suggest → { ok, suggestion:{ detailSourceEntity, kind, detailKeyFields:[...], reason } }
// Zonder AI-key → HTTP 503 { error, code:'AI_NOT_CONFIGURED' } (borrelt op als Error met .status=503).
export function suggestRelation(id) {
  return apiRequest(`/admin/tables/${id}/relation/suggest`, { method: 'POST' });
}
