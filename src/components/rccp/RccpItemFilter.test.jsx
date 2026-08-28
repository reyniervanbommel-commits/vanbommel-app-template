import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RccpItemFilter from './RccpItemFilter';

const ITEMS = ['CBM-1', 'CFM-10018-21-01'];
const EXTRA_COLUMNS = [
  { key: 'productName', label: 'Product name' },
  { key: 'color', label: 'Color' },
];
const EXTRA_VALUES = {
  'CBM-1': { productName: 'Boot', color: 'Black' },
  'CFM-10018-21-01': { productName: 'Sneaker', color: 'White' },
};

function renderFilter(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    value: [],
    onChange,
    items: ITEMS,
    ...overrides,
  };
  render(
    <FluentProvider theme={webLightTheme}>
      <RccpItemFilter {...props} />
    </FluentProvider>,
  );
  return { onChange };
}

describe('RccpItemFilter', () => {
  it('shows all items until unique items are selected', () => {
    renderFilter();
    expect(screen.getByRole('combobox').value).toBe('All items');
  });

  it('filters the option list by item number while typing', () => {
    renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '10018' } });
    const options = screen.getAllByRole('menuitemcheckbox').map((el) => el.textContent);
    expect(options).toEqual(['CFM-10018-21-01']);
  });

  it('filters the option list by extra item columns', () => {
    renderFilter({ extraColumns: EXTRA_COLUMNS, extraValues: EXTRA_VALUES });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'sneaker' } });
    expect(screen.getByRole('menuitemcheckbox', { name: /CFM-10018-21-01/i }).textContent).toContain('Sneaker');
    expect(screen.queryByRole('menuitemcheckbox', { name: /CBM-1/ })).toBeNull();
  });

  it('calls onChange with the selected item numbers', () => {
    const { onChange } = renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'CBM-1' }));
    expect(onChange).toHaveBeenCalledWith(['CBM-1']);
  });

  it('calls onChange with an empty list when All items is selected', () => {
    const { onChange } = renderFilter({ value: ['CBM-1'] });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'All items' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('stays visible when there are no unique items', () => {
    renderFilter({ items: [] });
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    expect(screen.getByText('No unique items in the selected weeks')).toBeTruthy();
  });
});
