// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpLoadDateToggle from './RccpLoadDateToggle';

describe('RccpLoadDateToggle', () => {
  it('marks Requested as selected by default and switches to Confirmed', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="requested" onChange={onChange} />,
    );
    expect(getByRole('radio', { name: 'Requested' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(getByRole('radio', { name: 'Confirmed' }));
    expect(onChange).toHaveBeenCalledWith('confirmed');
  });

  it('appends the confirmed pair share to the Confirmed label', () => {
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="requested" confirmedPercent={64.4} />,
    );
    expect(getByRole('radio', { name: 'Confirmed 64%' })).toBeTruthy();
  });
});
