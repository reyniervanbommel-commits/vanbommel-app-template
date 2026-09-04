// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpIsoWeekRangePicker from './RccpIsoWeekRangePicker';

const DATA_WINDOW = { fromYear: 2021, fromWeek: 47, toYear: 2022, toWeek: 51 };

function pressedWeekButtons() {
  return screen.queryAllByRole('button', { pressed: true })
    .filter((button) => button.getAttribute('data-iso-week'));
}

describe('RccpIsoWeekRangePicker', () => {
  it('enables Show weeks with data when the vendor has load, even if those weeks are selected', () => {
    renderWithFluent(
      <RccpIsoWeekRangePicker
        window={DATA_WINDOW}
        onReplaceWindow={vi.fn()}
        analysis={{ dataWindow: DATA_WINDOW }}
        onShowDataWindow={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Period / }));
    expect(screen.getByRole('button', { name: 'Show weeks with data' })).not.toBeDisabled();
  });

  it('Clear all unselects every week in the picker', () => {
    function Harness() {
      const [isoWindow, setIsoWindow] = useState(DATA_WINDOW);
      return (
        <RccpIsoWeekRangePicker
          window={isoWindow}
          onReplaceWindow={setIsoWindow}
          analysis={{ dataWindow: DATA_WINDOW }}
        />
      );
    }
    renderWithFluent(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Period / }));
    expect(pressedWeekButtons().length).toBeGreaterThan(8);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(pressedWeekButtons()).toHaveLength(0);
  });
});
