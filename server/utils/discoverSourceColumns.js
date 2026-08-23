'use strict';

/**
 * Bepaalt welke bestaande bronkolommen Discover mag wissen: wel in tb_columns,
 * niet in de D365-sample, geen sleutel-/beschermd veld, geen custom/lookup.
 * Lege discovery → niets wissen (voorkomt dat een mislukte sample alles weghaalt).
 */
function listStaleSourceColumns(existingColumns, discoveredFields, protectedSourceFields = []) {
  const discovered = new Set(
    (Array.isArray(discoveredFields) ? discoveredFields : [])
      .map((entry) => String(entry?.field || entry || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if (!discovered.size) return [];

  const protectedFields = new Set(
    (Array.isArray(protectedSourceFields) ? protectedSourceFields : [])
      .map((field) => String(field || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return (Array.isArray(existingColumns) ? existingColumns : []).filter((column) => {
    if (String(column?.source || '').trim() !== 'source') return false;
    const sourceField = String(column?.sourceField || '').trim();
    if (!sourceField) return false;
    const normalized = sourceField.toLowerCase();
    if (protectedFields.has(normalized)) return false;
    return !discovered.has(normalized);
  });
}

module.exports = { listStaleSourceColumns };
