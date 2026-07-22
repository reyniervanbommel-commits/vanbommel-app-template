'use strict';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const STATUS_COLOR_PALETTE = [
  '#c4c4c4',
  '#e2445c',
  '#fdab3d',
  '#00c875',
  '#037f4c',
  '#579bfc',
  '#a25ddc',
  '#ff5ac4',
  '#ffcb00',
  '#784bd1',
];

function slugifyLabel(label) {
  return String(label || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'status';
}

function normalizeStatusOption(raw, index = 0) {
  if (typeof raw === 'string') {
    const label = raw.trim();
    if (!label) return null;
    return {
      id: slugifyLabel(label),
      label,
      color: STATUS_COLOR_PALETTE[(index + 1) % STATUS_COLOR_PALETTE.length],
    };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const label = String(raw.label || '').trim().slice(0, 64);
  if (!label) return null;
  const color = HEX_COLOR_PATTERN.test(String(raw.color || ''))
    ? String(raw.color).toLowerCase()
    : STATUS_COLOR_PALETTE[(index + 1) % STATUS_COLOR_PALETTE.length];
  const id = String(raw.id || slugifyLabel(label)).trim().slice(0, 64) || slugifyLabel(label);
  return { id, label, color };
}

function createDefaultStatusOptions() {
  return [
    { id: 'new', label: 'New', color: '#e2445c' },
    { id: 'in_progress', label: 'In progress', color: '#fdab3d' },
    { id: 'done', label: 'Done', color: '#00c875' },
  ];
}

function normalizeStatusOptions(raw) {
  if (!Array.isArray(raw) || !raw.length) return createDefaultStatusOptions();
  const seenLabels = new Set();
  const seenIds = new Set();
  const normalized = [];
  raw.forEach((entry, index) => {
    const option = normalizeStatusOption(entry, index);
    if (!option) return;
    if (seenLabels.has(option.label.toLowerCase()) || seenIds.has(option.id)) return;
    seenLabels.add(option.label.toLowerCase());
    seenIds.add(option.id);
    normalized.push(option);
  });
  if (!normalized.length) throw Object.assign(new Error('A status column requires at least one label'), { status: 400 });
  if (normalized.length > 30) throw Object.assign(new Error('A status column supports at most 30 labels'), { status: 400 });
  return normalized;
}

function getAllowedStatusLabels(options) {
  return normalizeStatusOptions(options).map((option) => option.label);
}

function buildStatusLabelRenames(previousOptions, nextOptions) {
  const previous = Array.isArray(previousOptions) && previousOptions.length
    ? previousOptions.map((entry, index) => normalizeStatusOption(entry, index)).filter(Boolean)
    : [];
  const next = normalizeStatusOptions(nextOptions);
  const nextById = new Map(next.map((option) => [option.id, option]));
  const renames = [];
  previous.forEach((oldOption) => {
    const newOption = nextById.get(oldOption.id);
    if (newOption && oldOption.label !== newOption.label) {
      renames.push({ from: oldOption.label, to: newOption.label });
    }
  });
  return renames;
}

// Labels die in previousOptions bestaan maar (op id) niet meer voorkomen in nextOptions —
// d.w.z. de gebruiker heeft deze status verwijderd via de label-editor. Gebruikt om te bepalen
// of er nog cellen zijn die deze status gebruiken vóórdat de kolomconfiguratie wordt bijgewerkt.
function buildRemovedStatusOptions(previousOptions, nextOptions) {
  const previous = Array.isArray(previousOptions) && previousOptions.length
    ? previousOptions.map((entry, index) => normalizeStatusOption(entry, index)).filter(Boolean)
    : [];
  if (!previous.length) return [];
  const next = normalizeStatusOptions(nextOptions);
  const nextIds = new Set(next.map((option) => option.id));
  return previous.filter((option) => !nextIds.has(option.id));
}

module.exports = {
  HEX_COLOR_PATTERN,
  STATUS_COLOR_PALETTE,
  createDefaultStatusOptions,
  normalizeStatusOptions,
  getAllowedStatusLabels,
  buildStatusLabelRenames,
  buildRemovedStatusOptions,
  slugifyLabel,
};
