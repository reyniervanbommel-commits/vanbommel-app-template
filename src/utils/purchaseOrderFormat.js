// Hulpfuncties voor het netjes weergeven van purchase-order celwaarden en
// de versheidsindicator. Gehouden in een aparte util zodat tabel en pagina
// dezelfde formattering delen.

const NL_DATE = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const NL_DATETIME = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const NL_NUMBER = new Intl.NumberFormat('nl-NL');

/**
 * Formatteert een readonly D365-celwaarde op basis van het dataType.
 * Custom kolommen worden elders inline bewerkbaar gerenderd.
 */
export function formatCellValue(value, dataType) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (dataType === 'date') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return NL_DATE.format(parsed);
    }
    return String(value);
  }

  if (dataType === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(num)) {
      return NL_NUMBER.format(num);
    }
    return String(value);
  }

  if (dataType === 'boolean') {
    return value ? 'Ja' : 'Nee';
  }

  return String(value);
}

/**
 * Geeft een Nederlandse, relatieve "laatst ververst"-tekst terug.
 */
export function formatSyncedAt(syncedAt) {
  if (!syncedAt) return null;
  const parsed = new Date(syncedAt);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'zojuist';
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} uur geleden`;
  return NL_DATETIME.format(parsed);
}
