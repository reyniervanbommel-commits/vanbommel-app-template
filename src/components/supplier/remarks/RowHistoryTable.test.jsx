// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RowHistoryTable from './RowHistoryTable';

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

function renderTable(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <RowHistoryTable
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

describe('RowHistoryTable', () => {
  it('rendert history als tabel met filterbare headers', () => {
    renderTable({ useServerActionFilter: true, serverActionFilter: 'updated' });

    expect(screen.getByRole('table', { name: 'Row history' })).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Row history' });
    expect(table.querySelector('tbody .history-table-column')?.textContent).toBe('Leverdatum');
    expect(screen.getAllByText('09/04/2026')).toHaveLength(2);
    expect(screen.getByLabelText('Filter by user')).toBeTruthy();
  });

  it('filtert client-side op user', () => {
    renderTable();

    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'Taylor Buyer' } });
    const table = screen.getByRole('table', { name: 'Row history' });
    expect(table.querySelector('tbody .history-table-column')?.textContent).toBe('Status_1');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
  });
});
