'use strict';

// SourceProvider — het bron-neutrale contract voor de Table Builder (#139, Fase B).
// Eén interface, meerdere implementaties (D365ODataProvider, later SqlViewProvider/RestProvider).
// Geen enkele laag boven de provider kent D365: TableDataService en TableBuilderService praten
// uitsluitend via dit contract. De concrete provider wordt geresolved uit tb_sources.provider_type
// (zie providerFactory.js).
//
// Deze base class dient als documentatie én als vangnet: niet-geïmplementeerde methods gooien een
// duidelijke fout i.p.v. stil undefined terug te geven.

/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} discoverFields  Kan velden ontdekken voor de admin-kolompicker.
 * @property {boolean} [discoverEntities] Kan de beschikbare entiteiten ontdekken (entiteit-picker).
 * @property {boolean} [discoverRelations] Kan de relatie-kandidaten (nav-properties) ontdekken (relatie-picker).
 * @property {boolean} serverFilter    Ondersteunt filteren aan de bronkant.
 * @property {boolean} serverPaging    Ondersteunt paging aan de bronkant.
 * @property {boolean} masterDetail    Ondersteunt master-detail (1 -> 0..1) ophalen.
 * @property {boolean} writeBack       Ondersteunt terugschrijven van bronvelden.
 * @property {boolean} needsCache      Data moet in tb_cache gematerialiseerd worden (i.p.v. live lezen).
 */

/**
 * @typedef {Object} DiscoveredEntity
 * @property {string} name          Entity-set-naam (het pad-segment, bv. "PurchaseOrderHeadersV2").
 * @property {string} sourceEntity  Volledig bron-pad zoals in tb_tables (bv. "/data/PurchaseOrderHeadersV2").
 * @property {string} [entityType]  Volledig gekwalificeerde EntityType-naam uit de bron-metadata.
 */

/**
 * @typedef {Object} DiscoveredField
 * @property {string} field              Bron-veldnaam (source_field).
 * @property {string} [label]            Optioneel leesbaar label (admin mag overschrijven).
 * @property {'text'|'number'|'date'|'boolean'|'select'} dataType  Genormaliseerd datatype.
 * @property {'master'|'detail'} scope   Op welk niveau het veld hoort.
 * @property {boolean} nullable          Of het veld leeg mag zijn in de bron.
 */

/**
 * @typedef {Object} FetchRecord
 * @property {string} partitionKey       bv. dataAreaId.
 * @property {string} recordKey          Natuurlijke sleutel (bv. PurchaseOrderNumber).
 * @property {string|null} modifiedAt    Bron-wijzigingsmoment (ISO of null).
 * @property {Object} master             Master-veldwaarden ({ <columnKey>: value }).
 * @property {Array<{detailKey:number|null, values:Object}>} details  Detail-rijen.
 */

/**
 * @typedef {Object} FetchResult
 * @property {FetchRecord[]} records
 * @property {number} total
 * @property {boolean} truncated
 */

class SourceProvider {
  /**
   * Capabilities sturen cache-/filter-/paging-gedrag in de serve-laag aan.
   * @returns {ProviderCapabilities}
   */
  capabilities() {
    throw new Error('capabilities() niet geïmplementeerd door deze provider');
  }

  /**
   * Lichte verbindingstest (config + auth bereikbaar) — bewust GEEN zware metadata-/data-fetch.
   * Providers die dit niet implementeren gooien 501; de aanroeper valt dan terug op een discover-rooktest.
   * @returns {Promise<boolean>}
   */
  async ping() {
    throw Object.assign(new Error('ping() niet ondersteund door deze provider'), { status: 501 });
  }

  /**
   * Ontdek de beschikbare entiteiten (voor de admin-entiteit-picker), zodat de admin een entiteit
   * kan KIEZEN i.p.v. de naam te typen. Alleen zinvol als capabilities.discoverEntities === true.
   * @returns {Promise<DiscoveredEntity[]>}
   */
  async discoverEntities() {
    throw Object.assign(new Error('discoverEntities() niet ondersteund door deze provider'), { status: 501 });
  }

  /**
   * Ontdek de relatie-kandidaten (navigatie-eigenschappen) van de master-entiteit, zodat de admin de
   * detail-entiteit kan KIEZEN i.p.v. te typen. Alleen zinvol als capabilities.discoverRelations === true.
   * @param {{ sourceEntity: string }} _args
   * @returns {Promise<Array<{name:string, targetEntityType:string, isCollection:boolean}>>}
   */
  async discoverRelations(_args) {
    throw Object.assign(new Error('discoverRelations() niet ondersteund door deze provider'), { status: 501 });
  }

  /**
   * Ontdek de beschikbare bronvelden (master + detail) voor de admin-kolompicker.
   * @param {{ source: Object, sourceEntity: string, relation: Object|null }} _args
   * @returns {Promise<DiscoveredField[]>}
   */
  async discoverFields(_args) {
    throw Object.assign(new Error('discoverFields() niet ondersteund door deze provider'), { status: 501 });
  }

  /**
   * Haal rijen op uit de bron in de generieke records-vorm (master + details).
   * @param {{ source: Object, table: Object, columns: {master: Object[], detail: Object[]}, relation: Object|null, filters?: Object, paging?: Object }} _args
   * @returns {Promise<FetchResult>}
   */
  async fetch(_args) {
    throw Object.assign(new Error('fetch() niet geïmplementeerd door deze provider'), { status: 501 });
  }

  /**
   * Optioneel: schrijf één bronveld terug (alleen als capabilities.writeBack === true).
   * @param {Object} _args
   * @returns {Promise<{ok: boolean}>}
   */
  async writeField(_args) {
    throw Object.assign(new Error('writeField() niet ondersteund door deze provider'), { status: 501 });
  }
}

module.exports = { SourceProvider };
