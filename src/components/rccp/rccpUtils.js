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

/** Matrix column: short English month (Jan, Feb, …). */
export function formatMatrixMonthLabel(month) {
  return new Date(Date.UTC(2026, (Number(month) || 1) - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatMatrixPeriodAria(period) {
  if (period?.month) return `${formatMatrixMonthLabel(period.month)} ${period.year}`;
  return formatWeekLabel(period?.year, period?.week);
}

/** Cell-map token: calendar month in month view, ISO week otherwise. */
export function matrixPeriodToken(period) {
  return period?.month || period?.week;
}

/** Monday 00:00 UTC of the given ISO week. */
export function isoWeekStartUtc(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return start;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Vertaalt een ISO-weekvenster naar een `{ start, end }` datumrange (ISO-strings), inclusief
 * tot en met zondag 23:59:59.999 van de laatste week. Gedeeld door `useBiDateFilter` (React) en
 * `biBoardPrefetch` (buiten React) zodat beide exact dezelfde range berekenen.
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} isoWindow
 * @returns {{ start: string, end: string } | null}
 */
export function isoWindowDateRange(isoWindow) {
  if (!isoWindow) return null;
  const { fromYear, fromWeek, toYear, toWeek } = isoWindow;
  const start = isoWeekStartUtc(fromYear, fromWeek);
  const endMonday = isoWeekStartUtc(toYear, toWeek);
  const end = new Date(endMonday.getTime() + 7 * DAY_MS - 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Short English label for the Monday that starts the ISO week (e.g. "31 Mar"). */
export function formatIsoWeekMondayLabel(year, week) {
  return isoWeekStartUtc(year, week).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function compareIsoWeek(aYear, aWeek, bYear, bWeek) {
  if (aYear !== bYear) return aYear - bYear;
  return aWeek - bWeek;
}

function formatRolledWeekSpan(fromWeek, toWeek) {
  if (!fromWeek || !toWeek) return '';
  const from = formatMatrixWeekLabel(fromWeek);
  const to = formatMatrixWeekLabel(toWeek);
  return from === to ? `W${from}` : `W${from}–W${to}`;
}

/** Matrix column headers for ISO weeks or rolled-up calendar months. */
export function buildMatrixPeriodHeaders(periods) {
  if (!Array.isArray(periods) || !periods.length) return [];
  const spansYears = periods[0].year !== periods[periods.length - 1].year;
  return periods.map((period, index) => {
    const isMonth = Boolean(period.month);
    return {
      ...period,
      weekLabel: isMonth
        ? formatMatrixMonthLabel(period.month)
        : formatMatrixWeekLabel(period.week),
      mondayLabel: isMonth
        ? formatRolledWeekSpan(period.week, period.lastWeek)
        : formatIsoWeekMondayLabel(period.year, period.week),
      yearLabel: spansYears && (index === 0 || period.year !== periods[index - 1].year)
        ? String(period.year)
        : '',
    };
  });
}

function periodEndYear(period) {
  return period.lastYear || period.year;
}

function periodEndWeek(period) {
  return period.lastWeek || period.week;
}

function periodOverlapsWeekRange(period, range) {
  return compareIsoWeek(periodEndYear(period), periodEndWeek(period), range.fromYear, range.fromWeek) >= 0
    && compareIsoWeek(period.year, period.week, range.toYear, range.toWeek) <= 0;
}

/**
 * Map a configured week range onto visible chart period keys.
 * @returns {{ x1: string, x2: string, color: string, label?: string } | null}
 */
export function resolveChartWeekRangeBounds(range, periods) {
  if (!range || !Array.isArray(periods) || !periods.length) return null;

  const startIdx = periods.findIndex((period) => periodOverlapsWeekRange(period, range));
  if (startIdx < 0) return null;

  let endIdx = -1;
  for (let index = periods.length - 1; index >= 0; index -= 1) {
    if (periodOverlapsWeekRange(periods[index], range)) {
      endIdx = index;
      break;
    }
  }
  if (endIdx < startIdx) return null;

  return {
    x1: periods[startIdx].key,
    x2: periods[endIdx].key,
    color: range.color,
    label: range.label,
  };
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

/** ISO week-numbering years have 53 weeks when 1 Jan is a Thursday, or a Wednesday in a leap year. */
export function isoWeeksInYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 1) return 52;
  const weekday = new Date(Date.UTC(y, 0, 1)).getUTCDay() || 7;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return weekday === 4 || (leap && weekday === 3) ? 53 : 52;
}

export function clampIsoWeek(year, week) {
  const max = isoWeeksInYear(year);
  const n = Number(week);
  if (!Number.isFinite(n)) return 1;
  return Math.min(max, Math.max(1, Math.round(n)));
}

export function compareIsoWeekParts(a, b) {
  return (Number(a?.year) || 0) * 100 + (Number(a?.week) || 0)
    - ((Number(b?.year) || 0) * 100 + (Number(b?.week) || 0));
}

/** Local calendar date → ISO week-year (avoids timezone shift). */
export function isoWeekPartsFromLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return currentIsoWeekParts();
  return currentIsoWeekParts(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

/** First click starts a range; second click completes it (order-independent). */
export function isoWindowFromWeekClicks(anchor, next) {
  if (!next) return { window: null, nextAnchor: anchor || null };
  if (!anchor) {
    return {
      window: {
        fromYear: next.year, fromWeek: next.week, toYear: next.year, toWeek: next.week,
      },
      nextAnchor: next,
    };
  }
  const start = compareIsoWeekParts(anchor, next) <= 0 ? anchor : next;
  const end = compareIsoWeekParts(anchor, next) <= 0 ? next : anchor;
  return {
    window: {
      fromYear: start.year, fromWeek: start.week, toYear: end.year, toWeek: end.week,
    },
    nextAnchor: null,
  };
}

export const RCCP_WEEK_COL_WIDTH = 68;
export const RCCP_ROW_LABEL_WIDTH = 148;
export const RCCP_CHART_Y_AXIS_WIDTH = 42;
export const RCCP_CAPACITY_MEASURE_KEY = '__capacity__';
export const RCCP_OVERCAPACITY_MEASURE_KEY = '__overcapacity__';
export const RCCP_WARNING_MEASURE_KEY = '__warning__';
export const RCCP_CONFIRMED_DELIVERY_MEASURE_KEY = '__confirmed_delivery__';

/** Recharts CartesianGrid: vertical dashed lines at ISO week band edges (in chart coordinates). */
export function buildRccpChartWeekBoundaryCoordinates(periodCount) {
  return ({ offset }) => {
    const left = offset?.left ?? RCCP_CHART_Y_AXIS_WIDTH;
    return Array.from({ length: periodCount + 1 }, (_, index) => left + index * RCCP_WEEK_COL_WIDTH);
  };
}

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
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
}

/** Current ISO week-year and week number (Monday–Sunday). */
export function currentIsoWeekParts(now = new Date()) {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const year = utc.getUTCFullYear();
  return { year, week: clampIsoWeek(year, getIsoWeekNumber(now)) };
}

export function resolveRccpDashboardKpis(analysis, kpiWindowOnly) {
  if (!analysis) return null;
  if (kpiWindowOnly) return analysis.kpis || null;
  return analysis.kpisAll || analysis.kpis || null;
}

/** True when the selected weeks are empty but the vendor has load in another period. */
export function shouldOfferRccpDataWindow(analysis) {
  if (!analysis?.dataWindow) return false;
  const windowed = Number(analysis.kpis?.totalOrdered) || 0;
  const all = Number(analysis.kpisAll?.totalOrdered) || 0;
  return windowed === 0 && all > 0;
}

export function buildAnalysisQuery(window, vendorAccount, planningDate) {
  const params = new URLSearchParams({
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  if (planningDate && planningDate !== 'requested') params.set('planningDate', planningDate);
  return `/rccp/analysis?${params.toString()}`;
}

/**
 * Applies visual RCCP settings (chart type, colour, visibility, week bands) onto an
 * already-loaded analysis so the chart updates immediately after Save, before the
 * background refetch returns.
 */
export function applyRccpChartSettings(analysis, config) {
  if (!analysis || !config) return analysis;
  const byKey = new Map((config.quantityMeasures || []).map((measure) => [measure.columnKey, measure]));
  return {
    ...analysis,
    config: { ...analysis.config, ...config },
    measureRows: (analysis.measureRows || []).map((row) => {
      const measure = byKey.get(row.measureKey);
      if (measure) {
        return {
          ...row,
          label: measure.label || row.label,
          chartType: measure.chartType || row.chartType,
          color: measure.color || row.color,
          showInChart: measure.showInChart !== false,
        };
      }
      if (row.isCapacity) {
        return { ...row, showInChart: config.showCapacityLine !== false };
      }
      if (row.isWarning) {
        return { ...row, showInChart: config.showWarningLine !== false };
      }
      return row;
    }),
  };
}
