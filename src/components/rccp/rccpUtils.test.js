import { describe, expect, it } from 'vitest';
import {
  applyRccpChartSettings,
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  buildIsoYearWeeks,
  clampIsoWeek,
  compactIsoWindowForPrefetch,
  compareIsoWeekParts,
  currentIsoWindow,
  formatIsoWeekMondayLabel,
  isPersistableRccpIsoWindow,
  isoWindowWeekCount,
  formatMatrixWeekLabel,
  groupIsoWeeksByMonth,
  isoYearPickerYears,
  isoWeekPickerYearBounds,
  isoWeekPartsFromLocalDate,
  isoWindowFromWeekClicks,
  applyIsoWeekPickerClick,
  rccpHoverCenterX,
  isoWeeksInYear,
  clampRccpChartHeight,
  clampWeekPickerListHeight,
  currentIsoWeekParts,
  isMatrixCellEmpty,
  resolveChartWeekRangeBounds,
  resolveRccpDashboardKpis,
  hasRccpDataWindow,
  isSameIsoWindow,
  isIsoWeekInPickerRange,
  isRccpDataWeeksActionDisabled,
  rccpIsoWeekPickerBounds,
  shouldOfferRccpDataWindow,
  statusToken,
  statusForegroundToken,
  formatMatrixCellValue,
  RCCP_WEEK_COL_WIDTH,
} from './rccpUtils';

describe('statusToken', () => {
  it('returns distinct background tokens per load color', () => {
    expect(statusToken('green')).not.toBe(statusToken('orange'));
    expect(statusToken('red')).not.toBe(statusToken('green'));
    expect(statusToken('grey')).toBe(statusToken('unknown'));
  });
});

describe('statusForegroundToken', () => {
  it('returns distinct foreground tokens per load color', () => {
    expect(statusForegroundToken('green')).not.toBe(statusForegroundToken('orange'));
    expect(statusForegroundToken('red')).not.toBe(statusForegroundToken('green'));
    expect(statusForegroundToken('grey')).toBe(statusForegroundToken('unknown'));
  });
});

describe('matrix period headers', () => {
  it('shows week numbers only within a single year', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 1, key: '2026-W01' },
      { year: 2026, week: 2, key: '2026-W02' },
    ]);
    expect(headers[0].weekLabel).toBe('01');
    expect(headers[0].mondayLabel).toBe(formatIsoWeekMondayLabel(2026, 1));
    expect(headers[0].yearLabel).toBe('');
    expect(headers[1].yearLabel).toBe('');
  });

  it('shows year label when the range crosses years', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 52, key: '2026-W52' },
      { year: 2027, week: 1, key: '2027-W01' },
    ]);
    expect(formatMatrixWeekLabel(52)).toBe('52');
    expect(headers[0].yearLabel).toBe('2026');
    expect(headers[1].yearLabel).toBe('2027');
  });

  it('shows short month names and the rolled-up week span', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 10, lastWeek: 13, month: 3, key: '2026-M03' },
    ]);
    expect(headers[0].weekLabel).toBe('Mar');
    expect(headers[0].mondayLabel).toBe('W10–W13');
    expect(headers[0].yearLabel).toBe('');
  });

  it('shows a year on the first month of each year when the range crosses years', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2022, week: 48, lastWeek: 52, month: 12, key: '2022-M12' },
      { year: 2023, week: 1, lastWeek: 5, month: 1, key: '2023-M01' },
    ]);
    expect(headers[0].yearLabel).toBe('2022');
    expect(headers[1].yearLabel).toBe('2023');
  });
});

describe('isoWeeksInYear', () => {
  it('returns 53 weeks for 2020 and 52 for 2025', () => {
    expect(isoWeeksInYear(2020)).toBe(53);
    expect(isoWeeksInYear(2025)).toBe(52);
  });

  it('clamps week 53 in a 52-week year', () => {
    expect(clampIsoWeek(2025, 53)).toBe(52);
    expect(clampIsoWeek(2020, 53)).toBe(53);
    expect(clampIsoWeek(2026, 0)).toBe(1);
  });
});

describe('buildIsoYearWeeks', () => {
  it('lists every ISO week in the year with the Monday month', () => {
    const weeks = buildIsoYearWeeks(2020);
    expect(weeks).toHaveLength(53);
    expect(weeks[0]).toMatchObject({ year: 2020, week: 1, month: 11, monthYear: 2019 });
    expect(weeks[52]).toMatchObject({ year: 2020, week: 53, month: 11, monthYear: 2020 });
    expect(groupIsoWeeksByMonth(weeks)[0]).toMatchObject({ month: 11, monthYear: 2019 });
  });

  it('has 52 weeks in 2025 and groups January Mondays together', () => {
    const weeks = buildIsoYearWeeks(2025);
    expect(weeks).toHaveLength(52);
    expect(weeks[0]).toMatchObject({ year: 2025, week: 1, month: 11, monthYear: 2024 });
    const january = groupIsoWeeksByMonth(weeks).find((group) => group.month === 0 && group.monthYear === 2025);
    expect(january.weeks.map((item) => item.week)).toEqual([2, 3, 4, 5]);
  });
});

describe('isoWeekPickerYearBounds', () => {
  it('pads around the focused, current and data years', () => {
    expect(isoWeekPickerYearBounds({
      focusYear: 2026,
      viewYear: 2026,
      nowYear: 2026,
      dataFromYear: 2021,
      dataToYear: 2022,
      pad: 1,
    })).toEqual({ fromYear: 2020, toYear: 2027 });
  });

  it('caps a wide span around the viewed year', () => {
    expect(isoWeekPickerYearBounds({
      focusYear: 2026,
      viewYear: 2026,
      nowYear: 2026,
      dataFromYear: 2000,
      dataToYear: 2026,
      pad: 1,
      maxSpan: 12,
    })).toEqual({ fromYear: 2021, toYear: 2032 });
  });
});

describe('isoYearPickerYears', () => {
  it('shows a 12-year block around the anchor year', () => {
    expect(isoYearPickerYears(2026)).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
  });
});

describe('clampWeekPickerListHeight', () => {
  it('keeps the list between 96px and 720px', () => {
    expect(clampWeekPickerListHeight(40)).toBe(96);
    expect(clampWeekPickerListHeight(200)).toBe(200);
    expect(clampWeekPickerListHeight(900)).toBe(720);
    expect(clampWeekPickerListHeight('x')).toBe(520);
  });
});

describe('clampRccpChartHeight', () => {
  it('keeps the chart height between 120px and 560px', () => {
    expect(clampRccpChartHeight(40)).toBe(120);
    expect(clampRccpChartHeight(300)).toBe(300);
    expect(clampRccpChartHeight(900)).toBe(560);
    expect(clampRccpChartHeight('x', 180)).toBe(180);
  });
});

describe('isoWindowFromWeekClicks', () => {
  it('starts a single-week range then completes to the later week', () => {
    const first = isoWindowFromWeekClicks(null, { year: 2026, week: 10 });
    expect(first.window).toEqual({
      fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 10,
    });
    const second = isoWindowFromWeekClicks(first.nextAnchor, { year: 2026, week: 12 });
    expect(second.window.toWeek).toBe(12);
    expect(second.nextAnchor).toBeNull();
  });

  it('swaps when the second click is earlier', () => {
    const result = isoWindowFromWeekClicks({ year: 2026, week: 12 }, { year: 2026, week: 8 });
    expect(result.window).toEqual({
      fromYear: 2026, fromWeek: 8, toYear: 2026, toWeek: 12,
    });
  });
});

describe('applyIsoWeekPickerClick', () => {
  const range = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 20 };
  const w10 = { year: 2026, week: 10 };
  const w20 = { year: 2026, week: 20 };
  const w30 = { year: 2026, week: 30 };

  it('locks a week on the second click and keeps the current range', () => {
    const first = applyIsoWeekPickerClick({ pending: null, locked: null, window: range }, w10);
    expect(first.pending).toEqual(w10);
    expect(first.apply).toBe(false);
    const lock = applyIsoWeekPickerClick(first, w10);
    expect(lock.locked).toEqual(w10);
    expect(lock.window).toEqual(range);
    expect(lock.apply).toBe(false);
  });

  it('moves only the free end once a week is locked', () => {
    const locked = { pending: null, locked: w10, window: range };
    const next = applyIsoWeekPickerClick(locked, w30);
    expect(next.window).toEqual({
      fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 30,
    });
    expect(next.locked).toEqual(w10);
    expect(next.apply).toBe(true);
  });

  it('locks the end week so a later click moves the start', () => {
    const first = applyIsoWeekPickerClick({ pending: null, locked: null, window: range }, w20);
    const lock = applyIsoWeekPickerClick(first, w20);
    expect(lock.locked).toEqual(w20);
    const next = applyIsoWeekPickerClick(lock, w10);
    expect(next.window.fromWeek).toBe(10);
    expect(next.window.toWeek).toBe(20);
    expect(next.locked).toEqual(w20);
  });
});

describe('isoWeekPartsFromLocalDate', () => {
  it('maps a local calendar date onto the ISO week', () => {
    expect(isoWeekPartsFromLocalDate(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
    expect(isoWeekPartsFromLocalDate(new Date(2025, 11, 29))).toEqual({ year: 2026, week: 1 });
    expect(isoWeekPartsFromLocalDate(new Date(2023, 4, 1))).toEqual({ year: 2023, week: 18 });
    expect(isoWeekPartsFromLocalDate(new Date(2023, 4, 29))).toEqual({ year: 2023, week: 22 });
    expect(compareIsoWeekParts({ year: 2026, week: 2 }, { year: 2026, week: 1 })).toBeGreaterThan(0);
  });
});

describe('currentIsoWeekParts', () => {
  it('uses the ISO week-year around 1 January', () => {
    expect(currentIsoWeekParts(new Date('2024-12-30T12:00:00.000Z'))).toEqual({ year: 2025, week: 1 });
    expect(currentIsoWeekParts(new Date('2026-01-01T12:00:00.000Z'))).toEqual({ year: 2026, week: 1 });
  });
});

describe('resolveChartWeekRangeBounds', () => {
  const periods = [
    { year: 2026, week: 12, key: '2026-W12' },
    { year: 2026, week: 13, key: '2026-W13' },
    { year: 2026, week: 14, key: '2026-W14' },
    { year: 2026, week: 15, key: '2026-W15' },
  ];

  it('maps a configured range onto visible period keys', () => {
    const bounds = resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 13,
      toYear: 2026,
      toWeek: 14,
      color: '#00c875',
    }, periods);
    expect(bounds).toEqual({
      x1: '2026-W13',
      x2: '2026-W14',
      color: '#00c875',
      label: undefined,
    });
  });

  it('returns null when the range is outside the visible window', () => {
    expect(resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 1,
      toYear: 2026,
      toWeek: 2,
      color: '#579bfc',
    }, periods)).toBeNull();
  });

  it('maps a week range onto overlapping month columns', () => {
    const months = [
      { year: 2026, week: 10, lastWeek: 13, month: 3, key: '2026-M03' },
      { year: 2026, week: 14, lastWeek: 17, month: 4, key: '2026-M04' },
    ];
    const bounds = resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 13,
      toYear: 2026,
      toWeek: 14,
      color: '#00c875',
    }, months);
    expect(bounds).toEqual({
      x1: '2026-M03',
      x2: '2026-M04',
      color: '#00c875',
      label: undefined,
    });
  });
});

describe('buildRccpChartWeekBoundaryCoordinates', () => {
  it('uses the fixed chart Y-axis width so lines align with the week bands', () => {
    const coordinates = buildRccpChartWeekBoundaryCoordinates(3)({ offset: { left: 42 } });
    expect(coordinates).toEqual([
      42,
      42 + RCCP_WEEK_COL_WIDTH,
      42 + 2 * RCCP_WEEK_COL_WIDTH,
      42 + 3 * RCCP_WEEK_COL_WIDTH,
    ]);
  });

  it('ignores a Recharts plot offset that does not match the bar geometry', () => {
    expect(buildRccpChartWeekBoundaryCoordinates(1)({ offset: { left: 5 } }))
      .toEqual(buildRccpChartWeekBoundaryCoordinates(1)({ offset: { left: 42 } }));
  });
});

describe('isMatrixCellEmpty', () => {
  it('treats N/A zero cells as empty', () => {
    expect(isMatrixCellEmpty({
      statusLabel: 'N/A',
      availableQty: 0,
      confirmedQty: 0,
    })).toBe(true);
  });

  it('keeps cells with load or capacity', () => {
    expect(isMatrixCellEmpty({
      statusLabel: 'Unplanned',
      availableQty: 0,
      confirmedQty: 5,
    })).toBe(false);
  });
});

describe('formatMatrixCellValue', () => {
  it('leaves non-capacity cells blank when the value is zero', () => {
    expect(formatMatrixCellValue(0, false)).toBe('');
    expect(formatMatrixCellValue(null, false)).toBe('');
  });

  it('shows a dash for a zero available-capacity cell', () => {
    expect(formatMatrixCellValue(0, true)).toBe('-');
  });

  it('formats non-zero values the same for every row', () => {
    expect(formatMatrixCellValue(12, false)).toBe('12');
    expect(formatMatrixCellValue(12.5, true)).toBe('12.5');
  });
});

describe('applyRccpChartSettings', () => {
  it('updates chart type, colour and visibility on matching measures', () => {
    const analysis = {
      config: { showCapacityLine: true },
      measureRows: [
        { measureKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
        { measureKey: '__capacity__', label: 'Available capacity', chartType: 'line', isCapacity: true, showInChart: true },
        { measureKey: '__warning__', label: 'Warning threshold', chartType: 'line', isWarning: true, showInChart: true },
      ],
    };
    const next = applyRccpChartSettings(analysis, {
      quantityMeasures: [
        { columnKey: 'quantity', label: 'Qty', chartType: 'bar', color: '#0078D4', showInChart: false },
      ],
      showCapacityLine: false,
      showWarningLine: false,
      chartWeekRanges: [{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 4, color: '#00c875' }],
    });
    expect(next.measureRows[0]).toMatchObject({
      label: 'Qty', chartType: 'bar', color: '#0078D4', showInChart: false,
    });
    expect(next.measureRows[1].showInChart).toBe(false);
    expect(next.measureRows[2].showInChart).toBe(false);
    expect(next.config.chartWeekRanges).toHaveLength(1);
  });

  it('returns the original analysis when config is missing', () => {
    const analysis = { measureRows: [] };
    expect(applyRccpChartSettings(analysis, null)).toBe(analysis);
    expect(applyRccpChartSettings(null, {})).toBeNull();
  });
});

describe('resolveRccpDashboardKpis', () => {
  const windowed = { totalOrdered: 10 };
  const all = { totalOrdered: 99 };

  it('uses windowed KPIs when the selected-weeks toggle is on', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed, kpisAll: all }, true)).toBe(windowed);
  });

  it('uses all-data KPIs when the toggle is off', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed, kpisAll: all }, false)).toBe(all);
  });

  it('falls back to windowed KPIs when all-data is missing', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed }, false)).toBe(windowed);
  });
});

describe('hasRccpDataWindow', () => {
  const dataWindow = { fromYear: 2022, fromWeek: 1, toYear: 2022, toWeek: 53 };

  it('is true whenever the analysis knows a load window', () => {
    expect(hasRccpDataWindow({ dataWindow })).toBe(true);
    expect(hasRccpDataWindow({
      kpis: { totalOrdered: 10 },
      kpisAll: { totalOrdered: 99 },
      dataWindow,
    })).toBe(true);
    expect(hasRccpDataWindow({})).toBe(false);
  });

  it('detects when the selected weeks already match the load window', () => {
    expect(isSameIsoWindow(dataWindow, { ...dataWindow })).toBe(true);
    expect(isSameIsoWindow(dataWindow, { ...dataWindow, toWeek: 10 })).toBe(false);
  });

  it('keeps Show weeks with data available when those weeks are already selected', () => {
    expect(isRccpDataWeeksActionDisabled({ dataWindow }, dataWindow)).toBe(false);
    expect(isRccpDataWeeksActionDisabled({ dataWindow }, {
      fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8,
    })).toBe(false);
    expect(isRccpDataWeeksActionDisabled({}, dataWindow)).toBe(true);
  });
});

describe('iso week picker range', () => {
  it('selects no weeks after Clear all', () => {
    const wide = { fromYear: 2021, fromWeek: 47, toYear: 2022, toWeek: 51 };
    expect(rccpIsoWeekPickerBounds(wide, true)).toEqual({ from: null, to: null });
    expect(isIsoWeekInPickerRange({ year: 2021, week: 47 }, null, null)).toBe(false);
    expect(isIsoWeekInPickerRange({ year: 2022, week: 10 }, null, null)).toBe(false);
  });

  it('selects weeks inside an active range', () => {
    const { from, to } = rccpIsoWeekPickerBounds({
      fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12,
    });
    expect(isIsoWeekInPickerRange({ year: 2026, week: 11 }, from, to)).toBe(true);
    expect(isIsoWeekInPickerRange({ year: 2026, week: 13 }, from, to)).toBe(false);
  });
});

describe('shouldOfferRccpDataWindow', () => {
  const dataWindow = { fromYear: 2022, fromWeek: 1, toYear: 2022, toWeek: 53 };

  it('offers a jump when selected weeks are empty but the vendor has load elsewhere', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 0 },
      kpisAll: { totalOrdered: 120976 },
      dataWindow,
    })).toBe(true);
  });

  it('does not offer a jump when the selected weeks already have load', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 10 },
      kpisAll: { totalOrdered: 99 },
      dataWindow,
    })).toBe(false);
  });

  it('does not offer a jump when the vendor has no load at all', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 0 },
      kpisAll: { totalOrdered: 0 },
      dataWindow,
    })).toBe(false);
  });
});

describe('isoWindowWeekCount / persistable RCCP window', () => {
  it('counts weeks in a compact 8-week window', () => {
    expect(isoWindowWeekCount({
      fromYear: 2026, fromWeek: 31, toYear: 2026, toWeek: 38,
    })).toBe(8);
    expect(isPersistableRccpIsoWindow({
      fromYear: 2026, fromWeek: 31, toYear: 2026, toWeek: 38,
    })).toBe(true);
    expect(isPersistableRccpIsoWindow({
      fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 16,
    })).toBe(true);
  });

  it('rejects a range longer than two years as too wide to persist', () => {
    const huge = { fromYear: 2018, fromWeek: 1, toYear: 2026, toWeek: 1 };
    expect(isoWindowWeekCount(huge)).toBeGreaterThan(104);
    expect(isPersistableRccpIsoWindow(huge)).toBe(false);
    expect(isPersistableRccpIsoWindow({
      fromYear: 2021, fromWeek: 47, toYear: 2022, toWeek: 51,
    })).toBe(true);
  });

  it('falls back to the current 8-week window for prefetch when the stored range is wide', () => {
    const wide = { fromYear: 2021, fromWeek: 46, toYear: 2023, toWeek: 10 };
    expect(compactIsoWindowForPrefetch(wide)).toEqual(currentIsoWindow(8));
    const compact = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 };
    expect(compactIsoWindowForPrefetch(compact)).toEqual(compact);
    const quarter = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 16 };
    expect(isPersistableRccpIsoWindow(quarter)).toBe(true);
    expect(compactIsoWindowForPrefetch(quarter)).toEqual(currentIsoWindow(8));
  });
});

describe('rccpHoverCenterX', () => {
  it('returns the centre of the hovered period, on the fixed week grid', () => {
    // Y-axis width 42, week width 52: period 0 spans [42,94), centre 68.
    expect(rccpHoverCenterX(42, 10)).toBe(68);
    expect(rccpHoverCenterX(68, 10)).toBe(68);
    expect(rccpHoverCenterX(93, 10)).toBe(68);
    // Period 1 spans [94,146), centre 120.
    expect(rccpHoverCenterX(94, 10)).toBe(120);
    expect(rccpHoverCenterX(145, 10)).toBe(120);
  });

  it('returns null outside the plot area (over the row labels or past the last period)', () => {
    expect(rccpHoverCenterX(41, 10)).toBeNull();
    expect(rccpHoverCenterX(0, 10)).toBeNull();
    expect(rccpHoverCenterX(42 + 10 * 52, 10)).toBeNull();
  });

  it('returns null without a finite position or period count', () => {
    expect(rccpHoverCenterX(NaN, 10)).toBeNull();
    expect(rccpHoverCenterX(68, 0)).toBeNull();
    expect(rccpHoverCenterX(68, null)).toBeNull();
  });
});
