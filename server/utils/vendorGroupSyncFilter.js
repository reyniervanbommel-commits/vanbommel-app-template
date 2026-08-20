'use strict';

// VendorGroupId staat op VendorsV2, niet op PurchaseOrderHeadersV2. Een PO-syncfilter op
// vendor group wordt daarom bewaard als groep, en vlak voor D365/cache-matching omgezet naar
// OrderVendorAccountNumber (chunked OR). Dat is korter in de UI dan tientallen accounts.

const VENDOR_GROUP_FIELD = 'VendorGroupId';
const ACCOUNT_FIELD = 'OrderVendorAccountNumber';
const NO_MATCH_FIELD = 'PurchaseOrderNumber';
const NO_MATCH_VALUE = '__no_vendor_group_match__';
const GROUP_OPERATORS = new Set(['eq', 'oneof']);

function isVendorGroupRule(rule) {
  return String(rule?.field || '').trim() === VENDOR_GROUP_FIELD;
}

function listVendorGroupIds(rules) {
  const ids = [];
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (!isVendorGroupRule(rule)) continue;
    const operator = String(rule.operator || '').trim();
    if (!GROUP_OPERATORS.has(operator)) continue;
    if (operator === 'oneof') {
      const list = Array.isArray(rule.value)
        ? rule.value
        : String(rule.value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
      ids.push(...list);
      continue;
    }
    const value = String(rule.value ?? '').trim();
    if (value) ids.push(value);
  }
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

function vendorGroupCatalogEntry() {
  return {
    level: 'header',
    field: VENDOR_GROUP_FIELD,
    label: 'Vendor group',
    valueType: 'text',
    recommended: true,
    resolveVia: 'vendor-group',
    nonEmptyCount: Number.MAX_SAFE_INTEGER,
    fillRatio: 1,
    sampleValues: [],
  };
}

function isRecommendedFilterField(field) {
  const name = String(field || '');
  if (name === VENDOR_GROUP_FIELD || name === 'PurchaseOrderStatus') return true;
  return /group|pool|buyer/i.test(name);
}

function collectAccountsFromVendorRows(rows, groupIds) {
  const wanted = new Set(
    (Array.isArray(groupIds) ? groupIds : []).map((id) => String(id).trim().toLowerCase()).filter(Boolean)
  );
  if (!wanted.size) return [];
  const accounts = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    let json = row;
    if (row && typeof row.data_json === 'string') {
      try { json = JSON.parse(row.data_json); } catch { continue; }
    }
    if (!json || typeof json !== 'object') continue;
    const group = String(json.vendorGroupId || json.VendorGroupId || json.vendorGroup || '').trim().toLowerCase();
    if (!wanted.has(group)) continue;
    const account = String(
      json.vendorAccountNumber || json.VendorAccountNumber || json.vendorAccount || ''
    ).trim();
    if (account) accounts.push(account);
  }
  return [...new Set(accounts)];
}

/**
 * Vervangt VendorGroupId-regels door één OrderVendorAccountNumber one-of.
 * Geen accounts → een PO-filter die niets matcht (geen ongefilterde D365-call).
 */
function expandVendorGroupRules(rules, vendorAccounts) {
  const list = Array.isArray(rules) ? rules : [];
  if (!list.some(isVendorGroupRule)) return list;

  for (const rule of list) {
    if (!isVendorGroupRule(rule)) continue;
    const operator = String(rule.operator || '').trim();
    if (!GROUP_OPERATORS.has(operator)) {
      throw Object.assign(
        new Error('Vendor group only supports equals and is one of'),
        { status: 400 }
      );
    }
  }

  const otherRules = list.filter((rule) => !isVendorGroupRule(rule));
  const accounts = [...new Set((Array.isArray(vendorAccounts) ? vendorAccounts : [])
    .map((account) => String(account || '').trim())
    .filter(Boolean))];

  if (!accounts.length) {
    return [
      ...otherRules,
      {
        level: 'header',
        field: NO_MATCH_FIELD,
        operator: 'eq',
        valueType: 'text',
        value: NO_MATCH_VALUE,
      },
    ];
  }

  return [
    ...otherRules,
    {
      level: 'header',
      field: ACCOUNT_FIELD,
      operator: 'oneof',
      valueType: 'text',
      value: accounts,
    },
  ];
}

module.exports = {
  VENDOR_GROUP_FIELD,
  ACCOUNT_FIELD,
  NO_MATCH_FIELD,
  NO_MATCH_VALUE,
  isVendorGroupRule,
  listVendorGroupIds,
  vendorGroupCatalogEntry,
  isRecommendedFilterField,
  collectAccountsFromVendorRows,
  expandVendorGroupRules,
};
