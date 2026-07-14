// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { apiRequest } from '../../../utils/api';
import RemarksPanel from './RemarksPanel';

vi.mock('../../../utils/api', () => ({ apiRequest: vi.fn() }));

const ROW = { partitionKey: 'USMF', recordKey: 'PO-207' };

function responseFor(path) {
  if (path.endsWith('/remarks/summary')) return { rows: [] };
  if (path.includes('/remarks?')) return { items: [], total: 2, nextCursor: null };
  return {
    items: [],
    totals: { remarks: 0, history: 4, historyUpdated: 2 },
    nextCursor: null,
    newestCursor: 'cursor-1',
  };
}

function renderPanel(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <RemarksPanel
        open
        row={ROW}
        currentUser={{ id: 1, displayName: 'Taylor Buyer' }}
        columns={[{ id: 10, label: 'Status' }]}
        onClose={vi.fn()}
        {...props}
      />
    </FluentProvider>
  );
}

describe('RemarksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockImplementation(responseFor);
  });

  it('toont tabs, tellers, composer en tab-specifieke filterstate', async () => {
    renderPanel();

    expect(await screen.findByRole('tab', { name: 'Remarks (2)' })).toBeTruthy();
    expect(await screen.findByRole('tab', { name: /History \(\d+\)/ })).toBeTruthy();
    expect(screen.getByLabelText('Add a remark')).toBeTruthy();
    expect(screen.queryByLabelText('Filter by column')).toBeNull();

    const historyTab = screen.getByRole('tab', { name: /History \(\d+\)/ });
    fireEvent.click(historyTab);
    expect(await screen.findByLabelText('Filter by column')).toBeTruthy();
    expect(await screen.findByLabelText('Filter by action')).toBeTruthy();
    expect(await screen.findByLabelText('Filter by user')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('tab', { name: 'History (2)' })).toBeTruthy());
    expect(screen.getByText('No history has been recorded yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(await screen.findByLabelText('Add a remark')).toBeTruthy();
  });

  it('sluit via de knop en herstelt focus naar de opener', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    opener.textContent = 'Open remarks';
    document.body.appendChild(opener);
    const openerRef = { current: opener };
    const view = renderPanel({ onClose, openerRef });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Purchase order PO-207' })).toBe(document.activeElement)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close remarks panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    view.rerender(
      <FluentProvider theme={webLightTheme}>
        <RemarksPanel
          open={false}
          row={ROW}
          currentUser={{ id: 1, displayName: 'Taylor Buyer' }}
          columns={[]}
          onClose={onClose}
          openerRef={openerRef}
        />
      </FluentProvider>
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });

  it('roept onLocateRow aan wanneer op het PO-nummer wordt geklikt', async () => {
    const onLocateRow = vi.fn();
    renderPanel({ onLocateRow });

    fireEvent.click(await screen.findByRole('button', { name: 'Go to purchase order PO-207 in table' }));
    expect(onLocateRow).toHaveBeenCalledTimes(1);
  });
});
