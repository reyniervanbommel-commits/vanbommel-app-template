import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePurchaseOrdersActiveRulesFlyout } from './usePurchaseOrdersActiveRulesFlyout';

const headerColumns = [
  { key: 'vendor', label: 'Vendor', dataType: 'text' },
];
const lineColumns = [
  { key: 'qty', label: 'Qty', dataType: 'number' },
];

function createOptions(overrides = {}) {
  return {
    isStaff: true,
    headerColumns,
    lineColumns,
    orders: [],
    boardView: {
      filterByColumn: { vendor: { operator: 'contains', value: 'Acme' } },
      applyColumnFilter: vi.fn(),
      setColumnColorFilter: vi.fn(),
      clearColumnFilter: vi.fn(),
    },
    pageModel: {
      saveHeaderColumnFormatRules: vi.fn(),
      saveLineColumnFormatRules: vi.fn(),
    },
    datePeriodDisplayModes: {},
    headerColumnFormatRules: {},
    lineColumnFormatRules: {},
    ...overrides,
  };
}

describe('usePurchaseOrdersActiveRulesFlyout', () => {
  it('hides the flyout for vendors', () => {
    const { result } = renderHook(() => usePurchaseOrdersActiveRulesFlyout(createOptions({
      isStaff: false,
    })));

    expect(result.current.activeRulesControls).toBeUndefined();
    expect(result.current.flyoutProps).toBeNull();
  });

  it('builds flyout items only after the drawer is opened', () => {
    const { result } = renderHook(() => usePurchaseOrdersActiveRulesFlyout(createOptions()));

    expect(result.current.activeRulesControls.hasActive).toBe(true);
    expect(result.current.flyoutProps.filters.header).toEqual([]);

    act(() => {
      result.current.activeRulesControls.onOpenFlyout();
    });

    expect(result.current.flyoutProps.open).toBe(true);
    expect(result.current.flyoutProps.filters.header.map((item) => item.columnKey)).toEqual(['vendor']);
  });
});
