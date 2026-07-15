// Lightweight fingerprint zodat split-view charts opnieuw laden na tabelwijzigingen.
export function buildTableDataRevision(rows) {
  if (!Array.isArray(rows) || !rows.length) return '0';
  let hash = rows.length;
  rows.forEach((row) => {
    const values = row?.values || row || {};
    Object.values(values).forEach((value) => {
      const text = String(value ?? '');
      hash = ((hash << 5) - hash + text.length) | 0;
      hash = ((hash << 5) - hash + text.charCodeAt(0) || 0) | 0;
    });
  });
  return String(hash);
}
