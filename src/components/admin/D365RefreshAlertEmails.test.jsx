// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import D365RefreshAlertEmails from './D365RefreshAlertEmails';

describe('D365RefreshAlertEmails', () => {
  it('toont opgeslagen adressen als chips', () => {
    renderWithFluent(
      <D365RefreshAlertEmails
        emails={['ops@example.com']}
        onChange={() => {}}
        onSave={() => {}}
        saving={false}
      />,
    );
    expect(screen.getByText('ops@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove ops@example.com' })).toBeTruthy();
  });

  it('voegt een geldig adres toe', () => {
    const added = [];
    renderWithFluent(
      <D365RefreshAlertEmails
        emails={[]}
        onChange={(next) => added.push(next)}
        onSave={() => {}}
        saving={false}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'night@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(added[0]).toEqual(['night@example.com']);
  });
});
