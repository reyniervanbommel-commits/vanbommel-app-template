// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { apiRequest } from '../../utils/api';
import CellHistoryPopover from './CellHistoryPopover';

vi.mock('../../utils/api', () => ({ apiRequest: vi.fn() }));

const CELL_KEYS = {
  columnId: 101,
  dataAreaId: 'whsl',
  orderNumber: 'PO-1',
  lineNumber: null,
};

function renderPopover(hasHistory) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <CellHistoryPopover cellKeys={CELL_KEYS} dataType="text" hasHistory={hasHistory}>
        <span>Current value</span>
      </CellHistoryPopover>
    </FluentProvider>
  );
}

describe('CellHistoryPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toont alleen de celinhoud wanneer geen historie bestaat', () => {
    renderPopover(false);

    expect(screen.getByText('Current value')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View cell history' })).toBeNull();
  });

  it('toont een toegankelijke omgevouwen-hoektrigger wanneer historie bestaat', () => {
    renderPopover(true);

    const trigger = screen.getByRole('button', { name: 'View cell history' });
    expect(trigger.getAttribute('data-cell-history-trigger')).toBe('true');
  });

  it('opent de geschiedenis en gebruikt de actieve tb-route na een klik', async () => {
    apiRequest.mockResolvedValue({ history: [] });
    renderPopover(true);

    fireEvent.click(screen.getByRole('button', { name: 'View cell history' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      '/data/purchase-orders/history?columnId=101&partitionKey=whsl&recordKey=PO-1'
    ));
    expect(await screen.findByText('No changes have been recorded yet.')).toBeTruthy();
  });

  it('toont historie in afzonderlijke tabelkolommen', async () => {
    apiRequest.mockResolvedValue({
      history: [{
        at: '2026-07-13T10:15:00.000Z',
        user: { name: 'Test User', email: 'test@example.com' },
        action: 'update',
        oldValue: '2026-04-01T12:00:00Z',
        newValue: '2026-04-17T00:00:00.000Z',
        source: 'writeback',
        status: 'applied',
      }],
    });
    renderPopover(true);

    fireEvent.click(screen.getByRole('button', { name: 'View cell history' }));

    const table = await screen.findByRole('table', { name: 'Cell history' });
    expect(within(table).getByRole('columnheader', { name: 'Date' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'User' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Previous value' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'New value' })).toBeTruthy();
    expect(within(table).getByText('Test User')).toBeTruthy();
    expect(within(table).getByText('13/07/2026')).toBeTruthy();
    expect(within(table).getByText('01/04/2026')).toBeTruthy();
    expect(within(table).getByText('17/04/2026')).toBeTruthy();
    expect(within(table).getByText('Applied')).toBeTruthy();
  });
});
