import { tokens } from '@fluentui/react-components';

export function statusToken(color) {
  switch (color) {
    case 'green':
      return tokens.colorPaletteGreenBackground2;
    case 'orange':
      return tokens.colorPaletteDarkOrangeBackground2;
    case 'red':
      return tokens.colorPaletteRedBackground2;
    default:
      return tokens.colorNeutralBackground4;
  }
}

export function formatWeekLabel(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Matrix column: week only (01, 02, …). Year shown separately when the range crosses years. */
export function formatMatrixWeekLabel(week) {
  return String(week).padStart(2, '0');
}

/**
 * @param {{ year: number, week: number, key: string }[]} periods
 * @returns {{ year: number, week: number, key: string, weekLabel: string, yearLabel: string }[]}
 */
export function buildMatrixPeriodHeaders(periods) {
  if (!Array.isArray(periods) || !periods.length) return [];
  const spansYears = periods[0].year !== periods[periods.length - 1].year;
  return periods.map((period, index) => ({
    ...period,
    weekLabel: formatMatrixWeekLabel(period.week),
    yearLabel: spansYears && (index === 0 || period.year !== periods[index - 1].year)
      ? String(period.year)
      : '',
  }));
}

export function isMatrixCellEmpty(cell) {
  if (!cell) return true;
  return cell.statusLabel === 'N/A' && cell.availableQty <= 0 && cell.confirmedQty <= 0;
}

export function formatMatrixQty(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatIsoWindowLabel(window) {
  if (!window) return '';
  return `${formatWeekLabel(window.fromYear, window.fromWeek)} → ${formatWeekLabel(window.toYear, window.toWeek)}`;
}

export const RCCP_WEEK_COL_WIDTH = 72;
export const RCCP_ROW_LABEL_WIDTH = 148;
export const RCCP_CAPACITY_MEASURE_KEY = '__capacity__';

export function currentIsoWindow(size = 8) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = Math.max(1, Math.min(53, getIsoWeekNumber(now)));
  const fromWeek = Math.max(1, week - Math.floor(size / 2));
  return {
    fromYear: year,
    fromWeek,
    toYear: year,
    toWeek: Math.min(53, fromWeek + size - 1),
  };
}

function getIsoWeekNumber(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - yearStartDay);
  return 1 + Math.round((target - yearStart) / (7 * 24 * 60 * 60 * 1000));
}

export function buildAnalysisQuery(window, vendorAccount) {
  const params = new URLSearchParams({
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  return `/rccp/analysis?${params.toString()}`;
}
