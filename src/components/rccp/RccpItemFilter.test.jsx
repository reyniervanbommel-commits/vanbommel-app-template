import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RccpItemFilter from './RccpItemFilter';

const ITEMS = ['CBM-1', 'CFM-10018-21-01'];

function renderFilter(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    value: '',
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
  it('shows all items until a unique item is selected', () => {
    renderFilter();
    expect(screen.getByRole('combobox').value).toBe('All items');
  });

  it('filters the option list by item number while typing', () => {
    renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '10018' } });
    const options = screen.getAllByRole('option').map((el) => el.textContent);
    expect(options).toEqual(['CFM-10018-21-01']);
  });

  it('calls onChange with the selected item number', () => {
    const { onChange } = renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('option', { name: 'CBM-1' }));
    expect(onChange).toHaveBeenCalledWith('CBM-1');
  });

  it('calls onChange with an empty string when All items is selected', () => {
    const { onChange } = renderFilter({ value: 'CBM-1' });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('option', { name: 'All items' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('stays visible when there are no unique items', () => {
    renderFilter({ items: [] });
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    expect(screen.getByText('No unique items in the selected weeks')).toBeTruthy();
  });
});
