'use strict';

// providerFactory — resolve de juiste SourceProvider uit tb_sources.provider_type (#139, Fase B).
// De serve-laag (TableDataService) en de builder-laag (TableBuilderService) kennen alleen dit contract;
// welke concrete bron erachter zit is hier het enige beslispunt. Voeg later sql_view/rest toe.

const { D365ODataProvider } = require('./D365ODataProvider');

// Singletons per provider-type: providers zijn stateless (op de metadata-cache in de provider zelf na).
const _instances = new Map();

const PROVIDER_TYPES = {
  d365_odata: () => new D365ODataProvider(),
};

/**
 * Geef een SourceProvider voor het opgegeven provider_type. Onbekend -> 501 (nog niet ondersteund).
 * @param {string} providerType  waarde uit tb_sources.provider_type ('d365_odata' | 'sql_view' | 'rest')
 * @returns {import('./SourceProvider').SourceProvider}
 */
function getProvider(providerType) {
  const key = String(providerType || '').trim();
  const factory = PROVIDER_TYPES[key];
  if (!factory) {
    throw Object.assign(
      new Error(`Geen provider voor brontype '${key || '(leeg)'}' (nog niet ondersteund in deze fase)`),
      { status: 501 },
    );
  }
  if (!_instances.has(key)) _instances.set(key, factory());
  return _instances.get(key);
}

/**
 * Resolve de provider uit een tabel-definitie (zoals getTableByKey teruggeeft: table.source.providerType).
 * @param {{ source?: { providerType?: string } }} table
 * @returns {import('./SourceProvider').SourceProvider}
 */
function getProviderForTable(table) {
  const providerType = table && table.source ? table.source.providerType : null;
  if (!providerType) {
    throw Object.assign(new Error('Tabel heeft geen brontype (provider_type ontbreekt)'), { status: 500 });
  }
  return getProvider(providerType);
}

module.exports = {
  getProvider,
  getProviderForTable,
  PROVIDER_TYPES,
};
