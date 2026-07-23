'use strict';

// Centrale registry van D365-enumvelden (single source of truth, backend-zijde).
//
// Elk enum-veld hoort bij een D365 EDM-enum (`enumType`). OData verwacht voor deze velden de
// namespace-notatie `Microsoft.Dynamics.DataEntities.<enumType>'<Member>'` i.p.v. een string-literal
// (zie server/utils/odataSyncFilter.js). Een string-literal (`ProductType eq 'Item'`) levert een
// HTTP 400 op bij D365 omdat het type niet matcht (Edm.String vs. de enum).
//
// Een nieuw enum-veld toevoegen = één regel hieronder.
// Frontend-mirror met dezelfde velden + toegestane members: src/hooks/useSyncFilters.js (ENUM_FIELDS).
// Houd beide bestanden in sync.
const D365_ENUM_FIELDS = Object.freeze({
  PurchaseOrderStatus: 'PurchStatus',
  ProductType: 'EcoResProductType',
});

// Is dit D365-veld een enum-veld (en dus enum-serialisatie vereist)?
function isEnumField(d365Field) {
  return Boolean(d365Field) && Object.prototype.hasOwnProperty.call(D365_ENUM_FIELDS, d365Field);
}

// Geeft het bijbehorende D365 enumType terug, of null als het veld geen enum is.
function enumTypeForField(d365Field) {
  return isEnumField(d365Field) ? D365_ENUM_FIELDS[d365Field] : null;
}

module.exports = { D365_ENUM_FIELDS, isEnumField, enumTypeForField };
