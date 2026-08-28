import { describe, expect, it } from 'vitest';
import {
  filterRccpItemPickerItems,
  rccpItemPickerDisplayValue,
  rccpItemPickerSearchText,
} from './rccpItemPicker';

const COLUMNS = [
  { key: 'productName', label: 'Product name' },
  { key: 'color', label: 'Color' },
];
const VALUES = {
  'CBM-1': { productName: 'Boot', color: 'Black' },
  'CFM-10018-21-01': { productName: 'Sneaker', color: 'White' },
};

describe('rccpItemPickerSearchText', () => {
  it('joins the item number and extra column values', () => {
    expect(rccpItemPickerSearchText('CBM-1', VALUES['CBM-1'], COLUMNS))
      .toBe('cbm-1 boot black');
  });
});

describe('filterRccpItemPickerItems', () => {
  const items = ['CBM-1', 'CFM-10018-21-01'];

  it('returns every item when the query is empty', () => {
    expect(filterRccpItemPickerItems(items, VALUES, COLUMNS, '')).toEqual(items);
  });

  it('matches the unique item number', () => {
    expect(filterRccpItemPickerItems(items, VALUES, COLUMNS, '10018')).toEqual(['CFM-10018-21-01']);
  });

  it('matches extra item-entity columns', () => {
    expect(filterRccpItemPickerItems(items, VALUES, COLUMNS, 'boot')).toEqual(['CBM-1']);
    expect(filterRccpItemPickerItems(items, VALUES, COLUMNS, 'white')).toEqual(['CFM-10018-21-01']);
  });
});

describe('rccpItemPickerDisplayValue', () => {
  it('shows All items when nothing is selected', () => {
    expect(rccpItemPickerDisplayValue([])).toBe('All items');
  });

  it('shows the item number for a single selection', () => {
    expect(rccpItemPickerDisplayValue(['CBM-1'])).toBe('CBM-1');
  });

  it('shows how many items are selected', () => {
    expect(rccpItemPickerDisplayValue(['CBM-1', 'CFM-2'])).toBe('2 items');
  });
});
