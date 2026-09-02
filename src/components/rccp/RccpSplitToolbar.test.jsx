// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithFluent } from '../../test-utils/render';
import RccpSplitToolbar from './RccpSplitToolbar';

const isoWindow = {
  fromYear: 2026,
  fromWeek: 10,
  toYear: 2026,
  toWeek: 16,
};

describe('RccpSplitToolbar', () => {
  it('shows compact week picker and toggle buttons for grain and load date', () => {
    const { getByRole } = renderWithFluent(
      <MemoryRouter>
        <RccpSplitToolbar
          isoWindow={isoWindow}
          onReplaceWindow={vi.fn()}
          periodGrain="week"
          onPeriodGrainChange={vi.fn()}
          planningDateMode="requested"
          onPlanningDateModeChange={vi.fn()}
          vendorAccount="V000356"
        />
      </MemoryRouter>,
    );
    expect(getByRole('button', { name: /Period / })).toBeTruthy();
    expect(getByRole('radio', { name: 'Week' })).toBeTruthy();
    expect(getByRole('radio', { name: 'Month' })).toBeTruthy();
    expect(getByRole('radio', { name: 'Requested' })).toBeTruthy();
    expect(getByRole('radio', { name: 'Confirmed' })).toBeTruthy();
    expect(getByRole('button', { name: 'Open RCCP page' })).toBeTruthy();
    expect(getByRole('group', { name: 'RCCP controls' }).textContent).toContain('Vendor: V000356');
  });
});
