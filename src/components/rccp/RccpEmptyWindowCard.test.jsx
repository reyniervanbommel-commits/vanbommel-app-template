// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpEmptyWindowCard from './RccpEmptyWindowCard';

describe('RccpEmptyWindowCard', () => {
  it('jumps to the weeks that contain vendor load', () => {
    const onShow = vi.fn();
    renderWithFluent(
      <RccpEmptyWindowCard
        dataWindow={{ fromYear: 2022, fromWeek: 1, toYear: 2022, toWeek: 53 }}
        onShow={onShow}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show weeks with data' }));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/2022-W01/)).toBeTruthy();
  });
});
