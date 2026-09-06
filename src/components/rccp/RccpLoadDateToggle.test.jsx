// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpLoadDateToggle from './RccpLoadDateToggle';

describe('RccpLoadDateToggle', () => {
  it('checks Requested by default and adds Confirmed alongside it', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="requested" onChange={onChange} />,
    );
    expect(getByRole('checkbox', { name: 'Requested' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'Confirmed' })).not.toBeChecked();
    fireEvent.click(getByRole('checkbox', { name: 'Confirmed' }));
    expect(onChange).toHaveBeenCalledWith({ requested: true, confirmed: true });
  });

  it('switches one load date off while both are on', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle
        value={{ requested: true, confirmed: true }}
        onChange={onChange}
      />,
    );
    fireEvent.click(getByRole('checkbox', { name: 'Requested' }));
    expect(onChange).toHaveBeenCalledWith({ requested: false, confirmed: true });
  });

  it('keeps the last active load date on', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="confirmed" onChange={onChange} />,
    );
    const confirmed = getByRole('checkbox', { name: 'Confirmed' });
    expect(confirmed).toBeDisabled();
    fireEvent.click(confirmed);
    // Uitgezet worden kan niet: elke doorgegeven waarde houdt confirmed aan.
    onChange.mock.calls.forEach(([next]) => {
      expect(next).toEqual({ requested: false, confirmed: true });
    });
  });

  it('shows confirmed percent on Confirmed', () => {
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="requested" confirmedPercent={64} />,
    );
    expect(getByRole('checkbox', { name: 'Confirmed 64%' })).toBeTruthy();
  });
});
