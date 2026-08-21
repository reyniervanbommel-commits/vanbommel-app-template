import { HEX_COLOR_PATTERN, getContrastTextColor } from './hexColor';

export { getContrastTextColor };

export const STATUS_COLOR_PALETTE = [
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

export function createDefaultStatusOptions() {
  return [
    { id: 'new', label: 'New', color: '#e2445c' },
    { id: 'in_progress', label: 'In progress', color: '#fdab3d' },
    { id: 'done', label: 'Done', color: '#00c875' },
  ];
}

export function normalizeStatusOption(raw, index = 0) {
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

export function normalizeStatusOptions(raw) {
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
  return normalized.length ? normalized : createDefaultStatusOptions();
}

export function getStatusOptionByValue(value, options) {
  const normalized = normalizeStatusOptions(options);
  const text = String(value ?? '').trim();
  if (!text) return null;
  return normalized.find((option) => option.label === text || option.id === text) || null;
}

/** Stable compare key for conditional formatting after label renames. */
export function normalizeStatusCompareKey(value, options) {
  const normalized = normalizeStatusOptions(options);
  const option = getStatusOptionByValue(value, normalized);
  if (option) return `id:${option.id}`;
  const slug = slugifyLabel(value);
  const byId = normalized.find((entry) => entry.id === slug);
  if (byId) return `id:${byId.id}`;
  return `raw:${String(value ?? '').trim().toLowerCase()}`;
}

export function buildStatusLabelRenames(previousOptions, nextOptions) {
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

export function resolveStatusCellColor(value, options) {
  const option = getStatusOptionByValue(value, options);
  if (option) return option.color;
  return '#c4c4c4';
}

export function isStatusColumn(column) {
  return String(column?.dataType || '').trim().toLowerCase() === 'status';
}
