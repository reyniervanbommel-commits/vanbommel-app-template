export const PLACEHOLDER_TOKEN = '{xxx}';
export const TRANSFORM_TYPES = {
  trim: 'Trim',
  remove: 'Verwijder tekst',
  replace: 'Vervang',
  substring: 'Deelreeks',
};

export function makeTransformDraft() {
  return { type: 'trim', value: '', from: '', to: '', start: '', end: '' };
}

export function normalizeTransform(draft, index) {
  const label = `Transform #${index + 1}`;
  switch (draft.type) {
    case 'trim':
      return { type: 'trim' };
    case 'remove':
      if (!draft.value) throw new Error(`${label}: 'Verwijder tekst' vereist een waarde.`);
      return { type: 'remove', value: draft.value };
    case 'replace':
      if (!draft.from) throw new Error(`${label}: 'Vervang' vereist een 'van'-waarde.`);
      return { type: 'replace', from: draft.from, to: draft.to || '' };
    case 'substring': {
      const start = Number(draft.start);
      if (!Number.isInteger(start) || start < 0) {
        throw new Error(`${label}: 'Deelreeks' vereist een geheel startgetal >= 0.`);
      }
      const result = { type: 'substring', start };
      if (draft.end !== '' && draft.end !== null && draft.end !== undefined) {
        const end = Number(draft.end);
        if (!Number.isInteger(end)) throw new Error(`${label}: eind moet een geheel getal zijn.`);
        result.end = end;
      }
      return result;
    }
    default:
      throw new Error(`${label}: onbekend type.`);
  }
}

export function toPreviewTransforms(transforms) {
  return transforms.reduce((acc, tf) => {
    if (!tf || typeof tf !== 'object') return acc;
    if (tf.type === 'trim') return [...acc, { type: 'trim' }];
    if (tf.type === 'remove') return tf.value ? [...acc, { type: 'remove', value: tf.value }] : acc;
    if (tf.type === 'replace') return tf.from ? [...acc, { type: 'replace', from: tf.from, to: tf.to || '' }] : acc;
    if (tf.type === 'substring') {
      const start = Number(tf.start);
      if (!Number.isInteger(start) || start < 0) return acc;
      const next = { type: 'substring', start };
      const end = Number(tf.end);
      if (tf.end !== '' && Number.isInteger(end)) next.end = end;
      return [...acc, next];
    }
    return acc;
  }, []);
}
