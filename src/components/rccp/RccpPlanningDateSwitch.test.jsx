// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpPlanningDateSwitch from './RccpPlanningDateSwitch';

describe('RccpPlanningDateSwitch', () => {
  it('renders Requested and Confirmed radios with requested selected by default', () => {
    renderWithFluent(<RccpPlanningDateSwitch />);
    const requested = screen.getByRole('radio', { name: 'Requested' });
    const confirmed = screen.getByRole('radio', { name: 'Confirmed' });
    expect(requested).toBeTruthy();
    expect(confirmed).toBeTruthy();
    expect(requested.checked).toBe(true);
    expect(confirmed.checked).toBe(false);
  });
});
