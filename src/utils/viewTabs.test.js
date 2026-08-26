import { describe, expect, it } from 'vitest';
import {
  ALL_TAB_ID,
  buildBulkTabs,
  copyGroupExtraFilters,
  existingEqualsValues,
  filterRowsByFilters,
  inferGroupColumnKey,
  mergeFilters,
  nextGroupColor,
  normalizeTabsState,
  preferredSplitColumnKey,
  splitExtraFilters,
  uniqueColumnValues,
  upsertGroup,
  extraFiltersEqual,
  viewVendorAccount,
  vendorCanSeeView,
} from './viewTabs';

describe('viewTabs', () => {
  it('filtert rijen op view-base filters voor unieke tab-waarden', () => {
    const columns = [{ key: 'status', dataType: 'text' }];
    const rows = [
      { values: { status: 'Invoiced', vendorAccount: 'A' } },
      { values: { status: 'Open', vendorAccount: 'B' } },
    ];
    const filtered = filterRowsByFilters(rows, columns, {
      status: { operator: 'equals', value: 'Invoiced', secondaryValue: '' },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].values.vendorAccount).toBe('A');
  });

  it('neemt unieke niet-lege kolomwaarden uit de huidige rijen', () => {
    const rows = [
      { values: { vendorAccount: 'Q000104' } },
      { values: { vendorAccount: 'Q000104' } },
      { values: { vendorAccount: '  ' } },
      { values: { vendorAccount: 'Q000105' } },
      { values: {} },
    ];
    expect(uniqueColumnValues(rows, 'vendorAccount')).toEqual(['Q000104', 'Q000105']);
  });

  it('bouwt bulk-tabs en slaat bestaande equals-waarden over', () => {
    const existing = [{
      id: 'tab_old',
      name: 'Q000104',
      groupColumnKey: 'vendorAccount',
      extraFilters: { vendorAccount: { operator: 'equals', value: 'Q000104', secondaryValue: '' } },
    }];
    const created = buildBulkTabs({
      columnKey: 'vendorAccount',
      values: ['Q000104', 'Q000105'],
      existingTabs: existing,
    });
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('Q000105');
    expect(created[0].groupColumnKey).toBe('vendorAccount');
    expect(created[0].extraFilters.vendorAccount.value).toBe('Q000105');
    expect(existingEqualsValues([...existing, ...created], 'vendorAccount').has('q000104')).toBe(true);
  });

  it('splitst extra filters t.o.v. de view-base', () => {
    const extra = splitExtraFilters(
      {
        status: { operator: 'equals', value: 'Invoiced', secondaryValue: '' },
        vendorAccount: { operator: 'equals', value: 'Q000104', secondaryValue: '' },
      },
      { status: { operator: 'equals', value: 'Invoiced', secondaryValue: '' } }
    );
    expect(extra).toEqual({
      vendorAccount: { operator: 'equals', value: 'Q000104', secondaryValue: '', colors: undefined },
    });
    expect(mergeFilters({ status: { operator: 'equals', value: 'Invoiced' } }, extra).vendorAccount.value).toBe('Q000104');
  });

  it('kopieert groeps-extra-filters en behoudt de split-waarde', () => {
    const source = {
      id: 'a',
      groupColumnKey: 'vendorAccount',
      extraFilters: {
        vendorAccount: { operator: 'equals', value: 'A', secondaryValue: '' },
        delivery: { operator: 'after', value: '2026-01-01', secondaryValue: '' },
      },
    };
    const other = {
      id: 'b',
      groupColumnKey: 'vendorAccount',
      extraFilters: {
        vendorAccount: { operator: 'equals', value: 'B', secondaryValue: '' },
      },
    };
    const dateTab = {
      id: 'c',
      groupColumnKey: 'delivery',
      extraFilters: { delivery: { operator: 'before', value: '2026-02-01', secondaryValue: '' } },
    };
    const next = copyGroupExtraFilters(source, [source, other, dateTab], 'vendorAccount');
    expect(next[1].extraFilters.vendorAccount.value).toBe('B');
    expect(next[1].extraFilters.delivery.value).toBe('2026-01-01');
    expect(next[2].extraFilters.delivery.value).toBe('2026-02-01');
  });

  it('kiest vendorAccount als default split-kolom', () => {
    expect(preferredSplitColumnKey([
      { key: 'status' },
      { key: 'vendorAccount' },
    ])).toBe('vendorAccount');
  });

  it('zet groepskleur per kolom en hergebruikt ongebruikte paletkleur', () => {
    const groups = upsertGroup([], 'vendorAccount', nextGroupColor([]));
    expect(groups[0].columnKey).toBe('vendorAccount');
    expect(groups[0].color).toMatch(/^#/);
    expect(inferGroupColumnKey({ extraFilters: { vendorAccount: { operator: 'equals', value: 'X' } } })).toBe('vendorAccount');
  });

  it('toont all-vendors views aan elke leverancier en scoped views alleen aan het matchende account', () => {
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: '' }, 'Q000104')).toBe(true);
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: 'Q000104' }, 'Q000104')).toBe(true);
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: 'Q000104' }, 'Q000105')).toBe(false);
  });

  it('normaliseert tabs-state backwards-compatible', () => {
    const normalized = normalizeTabsState({
      extraTabs: [{ name: '  Open  ', extraFilters: { status: { operator: 'equals', value: 'Invoiced' } } }],
    });
    expect(normalized.extraTabs[0].name).toBe('Open');
    expect(normalized.groups).toEqual([]);
  });

  it('vergelijkt extra filters ongeacht lege secondaryValue', () => {
    expect(extraFiltersEqual(
      { status: { operator: 'equals', value: 'Open' } },
      { status: { operator: 'equals', value: 'Open', secondaryValue: '' } },
    )).toBe(true);
    expect(extraFiltersEqual(
      { status: { operator: 'equals', value: 'Open' } },
      { status: { operator: 'equals', value: 'Closed' } },
    )).toBe(false);
  });

  it('toont vendor-nummer alleen bij een vendor-view met account', () => {
    expect(viewVendorAccount({ scope: 'vendor', vendorAccount: 'Q000104' })).toBe('Q000104');
    expect(viewVendorAccount({ scope: 'vendor', viewState: { vendorAccount: 'Q000105' } })).toBe('Q000105');
    expect(viewVendorAccount({ scope: 'global', vendorAccount: 'Q000104' })).toBe('');
    expect(viewVendorAccount({ scope: 'vendor', vendorAccount: '  ' })).toBe('');
  });
});
