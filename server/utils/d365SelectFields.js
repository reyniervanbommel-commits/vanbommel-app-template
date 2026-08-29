'use strict';

// Velden die PurchaseOrderHeaderV2 / PurchaseOrderLineV2 niet exposeren (geverifieerd via
// $metadata / LIVE 400). Ze in $select zetten laat D365 de hele query met 400 afwijzen.
// Niet gokken uit docs — alleen velden die een $select-loze sample teruggeeft.
const FORBIDDEN_HEADER_D365_FIELDS = Object.freeze([
  'ModifiedDateTime',
  'PurchId',
  'PurchaseOrderId',
  'RecId',
  'VendorAccountNumber',
  'VendorName',
  'DocumentStatus',
  'RequestedDeliveryDateTime',
  'CreatedDateTime',
]);

const FORBIDDEN_LINE_D365_FIELDS = Object.freeze([
  'CurrencyCode',
  'RequestedReceiptDate',
  'RemainingPurchasePhysicalQuantity',
  'ReceivedPurchaseQuantity',
]);

function forbiddenSet(forbiddenFields) {
  return new Set(
    (Array.isArray(forbiddenFields) ? forbiddenFields : [])
      .map((field) => String(field || '').trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Bouwt de $select-lijst uit verplichte velden + actieve bronkolommen, minus velden
 * die D365 op deze entiteit niet kent.
 */
function buildD365SelectFields(requiredFields, columns, forbiddenFields = []) {
  const forbidden = forbiddenSet(forbiddenFields);
  const fields = new Set();
  for (const field of Array.isArray(requiredFields) ? requiredFields : []) {
    const name = String(field || '').trim();
    if (!name || forbidden.has(name.toLowerCase())) continue;
    fields.add(name);
  }
  for (const col of Array.isArray(columns) ? columns : []) {
    if (col?.source !== 'source' || !col.sourceField || String(col.sourceField).startsWith('@')) continue;
    const name = String(col.sourceField).trim();
    if (!name || forbidden.has(name.toLowerCase())) continue;
    fields.add(name);
  }
  return [...fields];
}

module.exports = {
  FORBIDDEN_HEADER_D365_FIELDS,
  FORBIDDEN_LINE_D365_FIELDS,
  buildD365SelectFields,
};
