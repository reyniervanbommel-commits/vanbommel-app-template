// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import ColorPalettePicker from './ColorPalettePicker';

describe('ColorPalettePicker', () => {
  it('toont een opacity-slider en het huidige percentage', () => {
    renderWithFluent(<ColorPalettePicker selectedColor="#e2445cb3" onSelect={() => {}} />);
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
  });

  it('behoudt opacity bij het kiezen van een andere swatch', () => {
    const onSelect = vi.fn();
    renderWithFluent(<ColorPalettePicker selectedColor="#e2445cb3" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: 'Pick color #00c875' }));
    expect(onSelect).toHaveBeenCalledWith('#00c875b3');
  });

  it('markeert de swatch op RGB, ook bij een 8-cijferige kleur', () => {
    renderWithFluent(<ColorPalettePicker selectedColor="#e2445cb3" onSelect={() => {}} />);
    expect(screen.getByRole('option', { name: 'Pick color #e2445c' })).toHaveAttribute('aria-selected', 'true');
  });
});
