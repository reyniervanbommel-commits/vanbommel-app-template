/** Parse yyyy-mm-dd to local Date at midnight, or null. */
export function parseIsoDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Format local Date as yyyy-mm-dd. */
export function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO-8601 week number (week starts Monday). */
export function getIsoWeekNumber(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
}

function startOfCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7; // Monday = 0
  return new Date(year, month, 1 - mondayOffset);
}

/** Build 5–6 weeks of dates for a month grid (Mon–Sun) with ISO week numbers. */
export function buildCalendarWeeks(year, month) {
  const start = startOfCalendarGrid(year, month);
  const weeks = [];
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const days = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
      days.push(date);
    }
    weeks.push({
      weekNumber: getIsoWeekNumber(days[0]),
      days,
    });
  }
  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek.days.every((d) => d.getMonth() !== month) && weeks.length > 5) {
    weeks.pop();
  }
  return weeks;
}

export function sameCalendarDay(a, b) {
  return Boolean(
    a
    && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate(),
  );
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
