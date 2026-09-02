import { describe, expect, it } from 'vitest';
import {
  nextRccpItemTableFilter,
  resolveRccpItemColumnKey,
  resolveRccpItemsFromFilter,
} from './resolveRccpItemFilter';

describe('resolveRccpItemColumnKey', () => {
  it('prefers itemNumber over the linked items header', () => {
    expect(resolveRccpItemColumnKey([
      { key: 'items' },
      { key: 'itemNumber' },
    ])).toBe('itemNumber');
  });

  it('falls back to items when itemNumber is not a header column', () => {
    expect(resolveRccpItemColumnKey([{ key: 'items' }, { key: 'vendorAccount' }])).toBe('items');
  });

  it('uses a header linked to line itemNumber', () => {
    expect(resolveRccpItemColumnKey(
      [{ key: 'artikel_values_4' }, { key: 'vendorAccount' }],
      [{ headerColumnKey: 'artikel_values_4', lineColumnKey: 'itemNumber' }],
    )).toBe('artikel_values_4');
  });

  it('returns empty when neither column exists', () => {
    expect(resolveRccpItemColumnKey([{ key: 'vendorAccount' }])).toBe('');
  });
});

describe('resolveRccpItemsFromFilter', () => {
  it('is inactive without an item filter', () => {
    expect(resolveRccpItemsFromFilter({
      vendorAccount: { operator: 'equals', value: 'V1' },
    })).toEqual({ items: [], active: false });
  });

  it('reads an equals filter on itemNumber', () => {
    expect(resolveRccpItemsFromFilter({
      itemNumber: { operator: 'equals', value: 'CBM-1' },
    })).toEqual({ items: ['CBM-1'], active: true });
  });

  it('reads a oneOf filter on items', () => {
    expect(resolveRccpItemsFromFilter({
      items: { operator: 'oneOf', value: ['CBM-1', 'CFM-2'] },
    })).toEqual({ items: ['CBM-1', 'CFM-2'], active: true });
  });

  it('reads a contains filter on a linked artikel-values header', () => {
    expect(resolveRccpItemsFromFilter(
      { artikel_values_4: { operator: 'contains', value: 'cbm' } },
      ['CBM-1', 'CFM-2'],
      'artikel_values_4',
    )).toEqual({ items: [], active: true, containsTerm: 'cbm' });
  });

  it('reads a startsWith filter on itemNumber', () => {
    expect(resolveRccpItemsFromFilter({
      itemNumber: { operator: 'startsWith', value: 'CBM' },
    })).toEqual({ items: [], active: true, containsTerm: 'cbm' });
  });

  it('reads a oneOf filter stored as a single string', () => {
    expect(resolveRccpItemsFromFilter({
      itemNumber: { operator: 'oneOf', value: 'CBM-1' },
    })).toEqual({ items: ['CBM-1'], active: true });
  });

  it('does not scan chart items for a contains filter', () => {
    expect(resolveRccpItemsFromFilter(
      { items: { operator: 'contains', value: 'CBM-1' } },
    )).toEqual({ items: [], active: true, containsTerm: 'cbm-1' });
  });

  it('stays active when contains matches nothing so the chart can hide stacks', () => {
    expect(resolveRccpItemsFromFilter(
      { itemNumber: { operator: 'contains', value: 'zzz' } },
      ['CBM-1'],
    )).toEqual({ items: [], active: true, containsTerm: 'zzz' });
  });
});

describe('nextRccpItemTableFilter', () => {
  it('sets equals on itemNumber and contains on the items header', () => {
    expect(nextRccpItemTableFilter('CBM-1', null, 'itemNumber')).toEqual({
      action: 'set',
      filter: { operator: 'equals', value: 'CBM-1', secondaryValue: '' },
    });
    expect(nextRccpItemTableFilter('CBM-1', null, 'items')).toEqual({
      action: 'set',
      filter: { operator: 'contains', value: 'CBM-1', secondaryValue: '' },
    });
    expect(nextRccpItemTableFilter('CBM-1', null, 'artikel_values_4')).toEqual({
      action: 'set',
      filter: { operator: 'contains', value: 'CBM-1', secondaryValue: '' },
    });
  });

  it('clears when the same SKU is already the sole filter', () => {
    expect(nextRccpItemTableFilter('CBM-1', { operator: 'equals', value: 'CBM-1' }))
      .toEqual({ action: 'clear' });
    expect(nextRccpItemTableFilter('CBM-1', { operator: 'contains', value: 'CBM-1' }, 'items'))
      .toEqual({ action: 'clear' });
    expect(nextRccpItemTableFilter('CBM-1', { operator: 'oneOf', value: ['CBM-1'] }))
      .toEqual({ action: 'clear' });
  });

  it('replaces a different SKU instead of adding to the selection', () => {
    expect(nextRccpItemTableFilter('CFM-2', { operator: 'equals', value: 'CBM-1' }).action)
      .toBe('set');
  });
});
