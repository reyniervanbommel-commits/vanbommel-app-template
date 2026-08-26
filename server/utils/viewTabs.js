'use strict';

const { HEX_COLOR_PATTERN } = require('./hexColor');

const MAX_EXTRA_TABS = 200;
const MAX_COLUMNS = 80;

function cloneFilter(filter) {
  if (!filter || typeof filter !== 'object') return null;
  return {
    operator: String(filter.operator || '').slice(0, 32),
    value: Array.isArray(filter.value)
      ? filter.value.map((entry) => String(entry).slice(0, 200)).slice(0, 50)
      : String(filter.value === null || filter.value === undefined ? '' : filter.value).slice(0, 200),
    secondaryValue: String(filter.secondaryValue === null || filter.secondaryValue === undefined ? '' : filter.secondaryValue).slice(0, 200),
  };
}

function normalizeExtraFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return {};
  const extra = {};
  Object.keys(rawFilters).slice(0, MAX_COLUMNS).forEach((rawKey) => {
    const key = String(rawKey).slice(0, 64);
    const cloned = cloneFilter(rawFilters[rawKey]);
    if (key && cloned && cloned.operator) extra[key] = cloned;
  });
  return extra;
}

function normalizeTabsState(rawTabs) {
  const input = rawTabs && typeof rawTabs === 'object' ? rawTabs : {};
  const extraTabs = Array.isArray(input.extraTabs) ? input.extraTabs : [];
  const groups = Array.isArray(input.groups) ? input.groups : [];

  const normalizedTabs = extraTabs.slice(0, MAX_EXTRA_TABS).map((tab, index) => {
    if (!tab || typeof tab !== 'object') return null;
    const id = String(tab.id || `tab_${index}`).trim().slice(0, 80);
    const name = String(tab.name || `Tab ${index + 1}`).trim().slice(0, 120);
    const extraFilters = normalizeExtraFilters(tab.extraFilters);
    const groupColumnKey = String(tab.groupColumnKey || '').slice(0, 64);
    if (!id || !name) return null;
    return { id, name, extraFilters, groupColumnKey };
  }).filter(Boolean);

  const normalizedGroups = groups.slice(0, MAX_COLUMNS).map((group) => {
    if (!group || typeof group !== 'object') return null;
    const columnKey = String(group.columnKey || '').slice(0, 64);
    const color = HEX_COLOR_PATTERN.test(String(group.color || '')) ? String(group.color).toLowerCase() : '';
    if (!columnKey) return null;
    return { columnKey, color, namePrefix: String(group.namePrefix || '').trim().slice(0, 40) };
  }).filter(Boolean);

  return { extraTabs: normalizedTabs, groups: normalizedGroups };
}

function normalizeVendorAccount(value) {
  return String(value === null || value === undefined ? '' : value).trim().slice(0, 64);
}

function normalizeViewTabSelection(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next = {};
  Object.keys(raw).slice(0, 100).forEach((viewId) => {
    const key = String(viewId).slice(0, 32);
    const tabId = String(raw[viewId] || 'all').slice(0, 80);
    if (key) next[key] = tabId || 'all';
  });
  return next;
}

function vendorCanSeeView(view, supplierAccount) {
  if (!view || view.scope !== 'vendor') return true;
  const assigned = normalizeVendorAccount(view.vendorAccount || (view.viewState && view.viewState.vendorAccount));
  if (!assigned) return true;
  return assigned.toLowerCase() === String(supplierAccount || '').trim().toLowerCase();
}

module.exports = {
  normalizeTabsState,
  normalizeVendorAccount,
  normalizeViewTabSelection,
  vendorCanSeeView,
};
