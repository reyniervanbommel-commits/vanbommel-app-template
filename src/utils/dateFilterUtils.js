// Date-specifieke filter-helpers. Puur, geen React/side-effects.

export function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function startOfNextWeek() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday).getTime();
}

export function dateMatchesFilter(rawValue, filter) {
  const rowTime = parseDateValue(rawValue);
  if (rowTime === null) return false;
  if (filter.operator === 'before') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime < target : true;
  }
  if (filter.operator === 'after') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime > target : true;
  }
  if (filter.operator === 'between') {
    const from = parseDateValue(filter.value);
    const to = parseDateValue(filter.secondaryValue);
    if (from === null || to === null) return true;
    return rowTime >= Math.min(from, to) && rowTime <= Math.max(from, to);
  }
  if (filter.operator === 'inNextWeeks') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    return rowTime >= start && rowTime <= start + (count * 7 * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'inNextDays') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    return rowTime >= start && rowTime <= start + (count * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'nextWeek') {
    const weekStart = startOfNextWeek();
    return rowTime >= weekStart && rowTime < weekStart + (7 * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'equals') {
    const target = parseDateValue(filter.value);
    if (target === null) return false;
    const a = new Date(rowTime);
    const b = new Date(target);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  return true;
}
