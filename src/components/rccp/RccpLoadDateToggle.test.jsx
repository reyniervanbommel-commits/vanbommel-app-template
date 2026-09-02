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
    expect(getByRole('radio', { name: 'Requested' })).toBeChecked();
    fireEvent.click(getByRole('radio', { name: 'Confirmed' }));
    expect(onChange).toHaveBeenCalledWith('confirmed');
  });

  it('shows confirmed percent on Confirmed', () => {
    const { getByRole } = renderWithFluent(
      <RccpLoadDateToggle value="requested" confirmedPercent={64} />,
    );
    expect(getByRole('radio', { name: 'Confirmed 64%' })).toBeTruthy();
  });
});
