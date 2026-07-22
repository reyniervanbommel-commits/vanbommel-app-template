import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RccpVendorFilter from './RccpVendorFilter';

const VENDORS = ['V000583', 'V000696'];
const VENDOR_NAMES = {
  V000583: 'Belcinto Vasconcelos E Ca, Lda',
  V000696: 'Procalcado For Ever',
};

function renderFilter(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    value: '',
    onChange,
    vendors: VENDORS,
    vendorNames: VENDOR_NAMES,
    loading: false,
    error: '',
    ...overrides,
  };
  render(
    <FluentProvider theme={webLightTheme}>
      <RccpVendorFilter {...props} />
    </FluentProvider>,
  );
  return { onChange };
}

describe('RccpVendorFilter', () => {
  it('shows the selected vendor number + name in the input', () => {
    renderFilter({ value: 'V000583' });
    const input = screen.getByRole('combobox');
    expect(input.value).toBe('V000583 — Belcinto Vasconcelos E Ca, Lda');
  });

  it('filters the option list by vendor NUMBER while typing', () => {
    renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '696' } });

    const options = screen.getAllByRole('option').map((el) => el.textContent);
    expect(options).toEqual(['V000696 — Procalcado For Ever']);
  });

  it('filters the option list by vendor NAME while typing', () => {
    renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'vasconcelos' } });

    const options = screen.getAllByRole('option').map((el) => el.textContent);
    expect(options).toEqual(['V000583 — Belcinto Vasconcelos E Ca, Lda']);
  });

  it('calls onChange with the vendor account when an option is selected', () => {
    const { onChange } = renderFilter();
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '696' } });
    fireEvent.click(screen.getByRole('option', { name: /V000696/ }));

    expect(onChange).toHaveBeenCalledWith('V000696');
  });

  it('calls onChange with an empty string when "All vendors" is selected', () => {
    const { onChange } = renderFilter({ value: 'V000583' });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('option', { name: 'All vendors' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('autofocuses the search input when autoFocus is true', () => {
    renderFilter({ autoFocus: true });
    const input = screen.getByRole('combobox');
    expect(document.activeElement).toBe(input);
  });

  it('does not autofocus the search input by default', () => {
    renderFilter();
    const input = screen.getByRole('combobox');
    expect(document.activeElement).not.toBe(input);
  });

  it('calls onHighlightVendor on hover (background prefetch signal)', () => {
    const onHighlightVendor = vi.fn();
    renderFilter({ onHighlightVendor });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.mouseEnter(screen.getByRole('option', { name: /V000696/ }));

    expect(onHighlightVendor).toHaveBeenCalledWith('V000696');
  });

  it('calls onHighlightVendor when typing narrows the list to a single exact match', () => {
    const onHighlightVendor = vi.fn();
    renderFilter({ onHighlightVendor });
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '696' } });

    expect(onHighlightVendor).toHaveBeenCalledWith('V000696');
  });
});
