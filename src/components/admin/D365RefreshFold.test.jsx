// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import D365RefreshFold from './D365RefreshFold';

describe('D365RefreshFold', () => {
  it('klapt standaard in als defaultOpen false is', () => {
    renderWithFluent(
      <D365RefreshFold title="Night alert emails" defaultOpen={false}>
        <span>chip body</span>
      </D365RefreshFold>,
    );
    expect(screen.queryByText('chip body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Night alert emails' }));
    expect(screen.getByText('chip body')).toBeTruthy();
  });
});
