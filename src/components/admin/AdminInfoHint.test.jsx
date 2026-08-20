// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import AdminInfoHint from './AdminInfoHint';

describe('AdminInfoHint', () => {
  it('opens the explanation on click', () => {
    renderWithFluent(<AdminInfoHint text="Re-import uses the current filter." label="About re-import" />);

    expect(screen.queryByText('Re-import uses the current filter.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'About re-import' }));
    expect(screen.getByText('Re-import uses the current filter.')).toBeTruthy();
  });

  it('renders nothing without text', () => {
    const { container } = renderWithFluent(<AdminInfoHint text="" />);
    expect(container.querySelector('button')).toBeNull();
  });
});
