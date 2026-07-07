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

export function resolveImageUrl(column, rowValues) {
  const options = column?.options;
  if (!options || typeof options !== 'object') return '';
  const { urlTemplate, sourceColumnKey } = options;
  if (typeof urlTemplate !== 'string' || !urlTemplate) return '';
  if (typeof sourceColumnKey !== 'string' || !sourceColumnKey) return '';
  if (!/^https?:\/\//i.test(urlTemplate)) return '';

  const raw = rowValues?.[sourceColumnKey];
  if (raw === undefined || raw === null || raw === '') return '';

  let value = String(raw);
  const transforms = Array.isArray(options.transforms) ? options.transforms : [];
  for (const transform of transforms) {
    value = applyTransform(value, transform);
  }
  const encoded = encodeURIComponent(value);
  return urlTemplate.split('{xxx}').join(encoded);
}
