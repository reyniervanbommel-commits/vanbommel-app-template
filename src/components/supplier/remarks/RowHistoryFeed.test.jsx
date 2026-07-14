// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RowHistoryFeed from './RowHistoryFeed';

const ITEMS = [
  {
    id: 'custom:1',
    type: 'custom',
    action: 'UPDATE',
    columnLabel: 'Leverdatum',
    actor: { name: 'System' },
    oldValue: '2026-04-09T00:00:00.000Z',
    newValue: '2026-04-09T12:00:00.000Z',
    createdAt: '2026-07-14T08:06:00.000Z',
  },
  {
    id: 'custom:2',
    type: 'custom',
    action: 'insert',
    columnLabel: 'Status_1',
    actor: { name: 'Taylor Buyer' },
    oldValue: null,
    newValue: 'Done',
    createdAt: '2026-07-14T09:41:00.000Z',
  },
];

function renderFeed(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <RowHistoryFeed
        items={ITEMS}
        loading={false}
        error=""
        hasMore={false}
        emptyMessage="No history has been recorded yet."
        onLoadOlder={vi.fn()}
        onRetry={vi.fn()}
        columns={[{ id: 10, label: 'Status' }]}
        {...props}
      />
    </FluentProvider>
  );
}

describe('RowHistoryFeed', () => {
  it('renders history as a timeline with external filters', () => {
    renderFeed({ useServerActionFilter: true, serverActionFilter: 'updated' });

    const feed = screen.getByLabelText('Row history');
    expect(feed).toBeTruthy();
    expect(feed.querySelector('.history-entry-title')?.textContent).toBe('Leverdatum');
    expect(screen.getAllByText('09/04/2026')).toHaveLength(2);
    expect(screen.getByLabelText('Filter by user')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('filters client-side on user', () => {
    renderFeed();

    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'Taylor Buyer' } });
    const feed = screen.getByLabelText('Row history');
    expect(feed.querySelector('.history-entry-title')?.textContent).toBe('Status_1');
    expect(feed.querySelectorAll('article')).toHaveLength(1);
  });
});
