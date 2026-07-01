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

// --- Velden ontdekken & kolommen -------------------------------------------

// GET /tables/:id/discover → { fields: [...] }
export function discoverFields(id) {
  return apiRequest(`/admin/tables/${id}/discover`);
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
