import { describe, expect, it } from 'vitest';
import {
  applyPlanningDateRowToggle,
  mergeChartVisibleKeys,
  overlayPlanningDateSwitches,
  sortRccpMatrixRows,
} from './rccpMatrixRows';

describe('sortRccpMatrixRows', () => {
  it('orders ordered, received, remaining, capacity, overcapacity', () => {
    const rows = [
      { measureKey: '__overcapacity__', isOvercapacity: true },
      { measureKey: '__capacity__', isCapacity: true },
      { measureKey: '__confirmed_delivery__', isConfirmedDelivery: true },
      { measureKey: '__requested_delivery__', isRequestedDelivery: true },
      { measureKey: 'open', isOpen: true },
      { measureKey: 'delivered', isDelivered: true },
      { measureKey: 'ordered' },
    ];
    expect(sortRccpMatrixRows(rows).map((row) => row.measureKey)).toEqual([
      'ordered',
      'delivered',
      'open',
      '__planning_date__',
      '__requested_delivery__',
      '__confirmed_delivery__',
      '__capacity__',
      '__overcapacity__',
    ]);
  });

  it('keeps warning rows last', () => {
    const rows = [
      { measureKey: '__warning__', isWarning: true },
      { measureKey: 'ordered' },
    ];
    expect(sortRccpMatrixRows(rows).map((row) => row.measureKey)).toEqual([
      'ordered',
      '__warning__',
    ]);
  });
});

describe('planning-date row toggles', () => {
  const rows = [
    { measureKey: '__requested_delivery__', isRequestedDelivery: true },
    { measureKey: '__confirmed_delivery__', isConfirmedDelivery: true },
  ];

  it('turns confirmed on and requested off, and ignores turning the active row off', () => {
    expect(applyPlanningDateRowToggle('__confirmed_delivery__', true, 'requested')).toBe('confirmed');
    expect(applyPlanningDateRowToggle('__requested_delivery__', true, 'confirmed')).toBe('requested');
    expect(applyPlanningDateRowToggle('__confirmed_delivery__', false, 'confirmed')).toBe('confirmed');
    expect(applyPlanningDateRowToggle('open', true, 'requested')).toBe('requested');
  });

  it('checks only the active planning-date row', () => {
    expect(overlayPlanningDateSwitches({}, rows, 'confirmed')).toEqual({
      __requested_delivery__: false,
      __confirmed_delivery__: true,
    });
    expect(overlayPlanningDateSwitches({}, rows, 'requested')).toEqual({
      __requested_delivery__: true,
      __confirmed_delivery__: false,
    });
  });
});

describe('mergeChartVisibleKeys', () => {
  const rows = [
    { measureKey: 'open', showInChart: true },
    { measureKey: '__capacity__', showInChart: false },
  ];

  it('uses the stored value when the user has not toggled yet', () => {
    expect(mergeChartVisibleKeys(rows, {}, { open: false, __capacity__: true })).toEqual({
      open: false,
      __capacity__: true,
    });
  });

  it('keeps an in-session toggle over stored and default values', () => {
    expect(mergeChartVisibleKeys(rows, { open: true }, { open: false })).toEqual({
      open: true,
      __capacity__: false,
    });
  });

  it('applies stored keys over in-session defaults when hydrating', () => {
    expect(mergeChartVisibleKeys(
      rows,
      { open: true, __capacity__: false },
      { open: false, __capacity__: true },
      { preferStored: true },
    )).toEqual({
      open: false,
      __capacity__: true,
    });
  });
});
