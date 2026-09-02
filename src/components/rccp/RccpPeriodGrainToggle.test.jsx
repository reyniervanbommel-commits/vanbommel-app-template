// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpPeriodGrainToggle from './RccpPeriodGrainToggle';

describe('RccpPeriodGrainToggle', () => {
  it('marks Week as selected by default and switches to Month', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithFluent(
      <RccpPeriodGrainToggle value="week" onChange={onChange} />,
    );
    expect(getByRole('radio', { name: 'Week' })).toBeChecked();
    fireEvent.click(getByRole('radio', { name: 'Month' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});
