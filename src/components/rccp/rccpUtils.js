import { tokens } from '@fluentui/react-components';

/** Fluent background token for matrix load-percentage cell fill. */
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

/** Fluent foreground token for matrix load-percentage text (used when cell fill is off). */
export function statusForegroundToken(color) {
  switch (color) {
    case 'green':
      return tokens.colorPaletteGreenForeground1;
    case 'orange':
      return tokens.colorPaletteDarkOrangeForeground1;
    case 'red':
      return tokens.colorPaletteRedForeground1;
    default:
      return tokens.colorNeutralForeground3;
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
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10;
  const [intPart, decPart] = String(Math.abs(rounded)).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  return decPart ? `${sign}${withThousands}.${decPart}` : `${sign}${withThousands}`;
}

/**
 * Matrix cell display text: blank for a zero/empty value, except the Available
 * capacity row which shows a dash for zero so an empty week stays legible.
 */
export function formatMatrixCellValue(value, isCapacityRow) {
  const n = Number(value) || 0;
  if (n === 0) return isCapacityRow ? '-' : '';
  return formatMatrixQty(n);
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

/** True when the week sits inside the picker highlight; a cleared range selects nothing. */
export function isIsoWeekInPickerRange(item, from, to) {
  if (!from?.year || !to?.year) return false;
  return compareIsoWeekParts(item, from) >= 0 && compareIsoWeekParts(item, to) <= 0;
}

/** `{ from, to }` for the calendar highlight. `cleared` drops every selected week. */
export function rccpIsoWeekPickerBounds(window, cleared = false) {
  if (cleared || !window?.fromYear || !window?.toYear) return { from: null, to: null };
  return {
    from: { year: window.fromYear, week: window.fromWeek },
    to: { year: window.toYear, week: window.toWeek },
  };
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

function sameIsoWeek(a, b) {
  return Boolean(a && b && compareIsoWeekParts(a, b) === 0);
}

function orderedIsoWindow(a, b) {
  const start = compareIsoWeekParts(a, b) <= 0 ? a : b;
  const end = compareIsoWeekParts(a, b) <= 0 ? b : a;
  return {
    fromYear: start.year, fromWeek: start.week, toYear: end.year, toWeek: end.week,
  };
}

/**
 * Week-picker click: two clicks on the same week lock it; later clicks move the other end.
 * @returns {{ pending: object|null, locked: object|null, window: object|null, apply: boolean }}
 */
export function applyIsoWeekPickerClick(state, parts) {
  const pending = state?.pending || null;
  const locked = state?.locked || null;
  const current = state?.window || null;
  const currentFrom = current ? { year: current.fromYear, week: current.fromWeek } : null;
  const currentTo = current ? { year: current.toYear, week: current.toWeek } : null;

  if (locked) {
    if (sameIsoWeek(locked, parts)) {
      if (pending && sameIsoWeek(pending, parts)) {
        return { pending: null, locked: null, window: current, apply: false };
      }
      return { pending: parts, locked, window: current, apply: false };
    }
    return {
      pending: null,
      locked,
      window: orderedIsoWindow(locked, parts),
      apply: true,
    };
  }

  if (pending && sameIsoWeek(pending, parts)) {
    const keepRange = sameIsoWeek(parts, currentFrom) || sameIsoWeek(parts, currentTo);
    return {
      pending: null,
      locked: parts,
      window: keepRange ? current : orderedIsoWindow(parts, parts),
      apply: !keepRange,
    };
  }

  if (pending) {
    return {
      pending: null,
      locked: null,
      window: orderedIsoWindow(pending, parts),
      apply: true,
    };
  }

  return { pending: parts, locked: null, window: current, apply: false };
}

/** All ISO weeks in a week-year, with the calendar month of each Monday. */
export function buildIsoYearWeeks(year) {
  const count = isoWeeksInYear(year);
  return Array.from({ length: count }, (_, index) => {
    const week = index + 1;
    const monday = isoWeekStartUtc(year, week);
    return {
      year,
      week,
      month: monday.getUTCMonth(),
      monthYear: monday.getUTCFullYear(),
      mondayLabel: formatIsoWeekMondayLabel(year, week),
    };
  });
}

export function groupIsoWeeksByMonth(weeks) {
  return (weeks || []).reduce((groups, item) => {
    const last = groups[groups.length - 1];
    if (!last || last.month !== item.month || last.monthYear !== item.monthYear) {
      groups.push({ month: item.month, monthYear: item.monthYear, weeks: [item] });
    } else {
      last.weeks.push(item);
    }
    return groups;
  }, []);
}

export function isoYearPickerYears(anchorYear) {
  const start = Number(anchorYear) - 6;
  return Array.from({ length: 12 }, (_, index) => start + index);
}

/**
 * Inclusive ISO-year range for the scrollable week picker.
 * Pads around the focused/current/data years, then caps around the viewed year.
 */
export function isoWeekPickerYearBounds({
  focusYear,
  viewYear,
  nowYear,
  dataFromYear,
  dataToYear,
  pad = 1,
  maxSpan = 16,
} = {}) {
  const wanted = [focusYear, viewYear, nowYear, dataFromYear, dataToYear]
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year) && year >= 1990 && year <= 2100);
  const fallback = new Date().getUTCFullYear();
  const years = wanted.length ? wanted : [fallback];
  let fromYear = Math.min(...years) - Number(pad);
  let toYear = Math.max(...years) + Number(pad);
  const span = toYear - fromYear + 1;
  const limit = Math.max(2, Number(maxSpan) || 16);
  if (span > limit) {
    const center = Number(viewYear || focusYear || fallback);
    fromYear = center - Math.floor((limit - 1) / 2);
    toYear = fromYear + limit - 1;
  }
  return { fromYear, toYear };
}

export const RCCP_WEEK_PICKER_MIN_HEIGHT = 96;
export const RCCP_WEEK_PICKER_MAX_HEIGHT = 720;
export const RCCP_WEEK_PICKER_DEFAULT_HEIGHT = 520;

export function clampWeekPickerListHeight(height) {
  const n = Number(height);
  if (!Number.isFinite(n)) return RCCP_WEEK_PICKER_DEFAULT_HEIGHT;
  return Math.min(RCCP_WEEK_PICKER_MAX_HEIGHT, Math.max(RCCP_WEEK_PICKER_MIN_HEIGHT, Math.round(n)));
}

export const RCCP_CHART_HEIGHT_MIN = 120;
export const RCCP_CHART_HEIGHT_MAX = 560;

/** Clamps the (resizable) chart height between chart and matrix to a sane range. */
export function clampRccpChartHeight(height, fallback = 180) {
  const n = Number(height);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(RCCP_CHART_HEIGHT_MAX, Math.max(RCCP_CHART_HEIGHT_MIN, Math.round(n)));
}

export const RCCP_WEEK_COL_WIDTH = 52;
export const RCCP_ROW_LABEL_WIDTH = 148;
export const RCCP_CHART_Y_AXIS_WIDTH = 42;
export const RCCP_CAPACITY_MEASURE_KEY = '__capacity__';
export const RCCP_OVERCAPACITY_MEASURE_KEY = '__overcapacity__';
export const RCCP_WARNING_MEASURE_KEY = '__warning__';

/** Recharts CartesianGrid: vertical dashed lines at ISO week band edges (in chart coordinates). */
/** Chart margin above the bars and the legend strip below them (Recharts layout). */
export const RCCP_CHART_TOP_MARGIN = 4;
export const RCCP_CHART_LEGEND_HEIGHT = 36;
export const RCCP_CHART_LEGEND_HEIGHT_COMPACT = 28;

/**
 * Vertical band the bars are actually drawn in, so the sticky Y-axis labels, the Today marker
 * and the plot itself use one and the same zero line. `height` is the plot height only — the
 * legend lives outside the chart (see rccpChartLegendHeight).
 * @returns {{ top: number, bottom: number, height: number }}
 */
export function rccpChartPlotArea(height) {
  const top = RCCP_CHART_TOP_MARGIN;
  const bottom = Math.max(top + 1, Number(height) || 0);
  return { top, bottom, height: bottom - top };
}

/** Height reserved below the chart for the always-visible legend. */
export function rccpChartLegendHeight(compact = false) {
  return compact ? RCCP_CHART_LEGEND_HEIGHT_COMPACT : RCCP_CHART_LEGEND_HEIGHT;
}

/**
 * Centre-x of the period under the mouse, computed from its position relative to the plot —
 * not from Recharts' own band scale. Recharts' tooltip axis ignores the hidden Y-axis width
 * when it builds that scale, so its usual cursor coordinate lands well right of the period's
 * true centre. Every other element (grid, bars, matrix columns) is already positioned from
 * the fixed `RCCP_CHART_Y_AXIS_WIDTH` + `RCCP_WEEK_COL_WIDTH` offsets above, so we derive the
 * hovered period the same way and skip Recharts' scale entirely.
 * @returns {number|null} pixel x of the period's centre, or null when outside the plot area
 */
export function rccpHoverCenterX(relativeX, periodCount) {
  if (!Number.isFinite(relativeX) || !Number.isFinite(periodCount) || periodCount <= 0) return null;
  const plotX = relativeX - RCCP_CHART_Y_AXIS_WIDTH;
  const plotWidth = periodCount * RCCP_WEEK_COL_WIDTH;
  if (plotX < 0 || plotX >= plotWidth) return null;
  const index = Math.floor(plotX / RCCP_WEEK_COL_WIDTH);
  return RCCP_CHART_Y_AXIS_WIDTH + index * RCCP_WEEK_COL_WIDTH + RCCP_WEEK_COL_WIDTH / 2;
}

export function buildRccpChartWeekBoundaryCoordinates(periodCount) {
  // Vast op RCCP_CHART_Y_AXIS_WIDTH, niet op Recharts' eigen plot-offset: de PO-balken tekenen
  // hun x zelf vanaf dezelfde constante, en de matrixkolommen starten op RCCP_ROW_LABEL_WIDTH.
  // Met de Recharts-offset (die bij een verborgen Y-as afwijkt) lopen grafiek en matrix uiteen.
  return () => Array.from(
    { length: periodCount + 1 },
    (_, index) => RCCP_CHART_Y_AXIS_WIDTH + index * RCCP_WEEK_COL_WIDTH,
  );
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

/** Idle prefetch stays on a short range so background loads stay cheap. */
export const RCCP_PREFETCH_MAX_WEEKS = 12;

/** User-chosen Period (including Show weeks with data) is persisted up to two ISO years. */
export const RCCP_PERSIST_MAX_WEEKS = 104;

/** Inclusive ISO-week count. Invalid or inverted windows return 0. */
export function isoWindowWeekCount(window) {
  const fromYear = Number(window?.fromYear);
  const fromWeek = Number(window?.fromWeek);
  const toYear = Number(window?.toYear);
  const toWeek = Number(window?.toWeek);
  if (![fromYear, fromWeek, toYear, toWeek].every(Number.isFinite)) return 0;
  if (compareIsoWeek(fromYear, fromWeek, toYear, toWeek) > 0) return 0;
  let count = 0;
  let year = fromYear;
  let week = fromWeek;
  while (compareIsoWeek(year, week, toYear, toWeek) <= 0) {
    count += 1;
    if (count > 600) return count;
    const max = isoWeeksInYear(year);
    if (week >= max) {
      year += 1;
      week = 1;
    } else {
      week += 1;
    }
  }
  return count;
}

export function isPersistableRccpIsoWindow(window, maxWeeks = RCCP_PERSIST_MAX_WEEKS) {
  const count = isoWindowWeekCount(window);
  return count > 0 && count <= maxWeeks;
}

/** Idle prefetch must not pull a multi-year dataWindow jump. */
export function compactIsoWindowForPrefetch(window) {
  return isPersistableRccpIsoWindow(window, RCCP_PREFETCH_MAX_WEEKS)
    ? window
    : currentIsoWindow(8);
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

/** True when the analysis includes a vendor load window, regardless of the selected weeks. */
export function hasRccpDataWindow(analysis) {
  return Boolean(analysis?.dataWindow?.fromYear && analysis?.dataWindow?.fromWeek);
}

/** Disable Show weeks with data only when there is no vendor load window to jump to. */
export function isRccpDataWeeksActionDisabled(analysis) {
  return !hasRccpDataWindow(analysis);
}

export function isSameIsoWindow(a, b) {
  if (!a || !b) return false;
  return Number(a.fromYear) === Number(b.fromYear)
    && Number(a.fromWeek) === Number(b.fromWeek)
    && Number(a.toYear) === Number(b.toYear)
    && Number(a.toWeek) === Number(b.toWeek);
}

/** True when the selected weeks are empty but the vendor has load in another period. */
export function shouldOfferRccpDataWindow(analysis) {
  if (!analysis?.dataWindow) return false;
  const windowed = Number(analysis.kpis?.totalOrdered) || 0;
  const all = Number(analysis.kpisAll?.totalOrdered) || 0;
  return windowed === 0 && all > 0;
}

export function buildAnalysisQuery(window, vendorAccount, planningDateMode) {
  const params = new URLSearchParams({
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  const mode = String(planningDateMode || '').toLowerCase() === 'confirmed' ? 'confirmed' : 'requested';
  params.set('planningDateMode', mode);
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
