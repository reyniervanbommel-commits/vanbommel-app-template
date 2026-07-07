function applyTransform(value, transform) {
  if (!transform || typeof transform !== 'object') return value;
  switch (transform.type) {
    case 'trim':
      return value.trim();
    case 'remove': {
      if (typeof transform.value !== 'string' || transform.value.length === 0) return value;
      return value.split(transform.value).join('');
    }
    case 'replace': {
      if (typeof transform.from !== 'string' || transform.from.length === 0) return value;
      const to = typeof transform.to === 'string' ? transform.to : '';
      return value.split(transform.from).join(to);
    }
    case 'substring': {
      if (!Number.isInteger(transform.start)) return value;
      if (Number.isInteger(transform.end)) {
        return value.substring(transform.start, transform.end);
      }
      return value.substring(transform.start);
    }
    default:
      return value;
  }
}

export function applyImageTransforms(rawValue, transforms) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return '';
  let value = String(rawValue);
  const safeTransforms = Array.isArray(transforms) ? transforms : [];
  for (const transform of safeTransforms) {
    value = applyTransform(value, transform);
  }
  return value;
}

export function resolveImageUrlFromConfig(config, rowValues) {
  const options = config && typeof config === 'object' ? config : null;
  if (!options) return '';
  const { urlTemplate, sourceColumnKey } = options;
  if (typeof urlTemplate !== 'string' || !urlTemplate) return '';
  if (typeof sourceColumnKey !== 'string' || !sourceColumnKey) return '';
  if (!/^https?:\/\//i.test(urlTemplate)) return '';
  const raw = rowValues?.[sourceColumnKey];
  if (raw === undefined || raw === null || raw === '') return '';
  const value = applyImageTransforms(raw, options.transforms);
  const encoded = encodeURIComponent(value);
  return urlTemplate.split('{xxx}').join(encoded);
}

export function resolveImageUrl(column, rowValues) {
  const options = column?.options;
  return resolveImageUrlFromConfig(options, rowValues);
}
