import React, { useCallback, useMemo, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrderCellContextMenu from './PurchaseOrderCellContextMenu';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';

const COLUMN = { key: 'status', label: 'Status', dataType: 'text' };
const CELL = { column: COLUMN, rawValue: 'Open' };
const LAYOUT = { className: 'cell', style: { width: '120px' } };

function SharedContextMenuTable({ applyFilter, clearFilter }) {
  const [context, setContext] = useState(null);
  const open = useCallback((target, cell) => setContext({ target, ...cell }), []);
  const close = useCallback(() => setContext(null), []);
  const contextMenu = useMemo(
    () => ({
      filterByColumn: {
        status: { operator: 'equals', value: 'Open', secondaryValue: '' },
      },
      open,
    }),
    [open]
  );
  const actions = useMemo(
    () => ({ applyFilter, clearFilter, close }),
    [applyFilter, clearFilter, close]
  );

  return (
    <>
      <table>
        <tbody>
          <tr>
            <PurchaseOrderDataCell cell={CELL} layout={LAYOUT} contextMenu={contextMenu}>
              Open
            </PurchaseOrderDataCell>
            <PurchaseOrderDataCell cell={CELL} layout={LAYOUT} contextMenu={contextMenu}>
              Open again
            </PurchaseOrderDataCell>
          </tr>
        </tbody>
      </table>
      <PurchaseOrderCellContextMenu context={context} actions={actions} />
    </>
  );
}

describe('shared purchase-order cell context menu', () => {
  it('opens one Fluent menu and preserves filter and clear actions', async () => {
    const applyFilter = vi.fn();
    const clearFilter = vi.fn();
    render(
      <FluentProvider theme={webLightTheme}>
        <SharedContextMenuTable applyFilter={applyFilter} clearFilter={clearFilter} />
      </FluentProvider>
    );

    fireEvent.contextMenu(screen.getByText('Open'));

    expect(await screen.findByText('Filter column on this cell')).toBeTruthy();
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    fireEvent.click(screen.getByText('Clear column filter'));
    expect(clearFilter).toHaveBeenCalledWith('status');

    fireEvent.contextMenu(screen.getByText('Open again'));
    fireEvent.click(await screen.findByText('Filter column on this cell'));
    expect(applyFilter).toHaveBeenCalledWith('status', 'Open');
  });

  it('copies the selected cell value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <FluentProvider theme={webLightTheme}>
        <SharedContextMenuTable applyFilter={vi.fn()} clearFilter={vi.fn()} />
      </FluentProvider>
    );

    fireEvent.contextMenu(screen.getByText('Open'));
    fireEvent.click(await screen.findByText('Copy cell value'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Open');
      expect(screen.queryByText('Copy cell value')).toBeNull();
    });
  });

  it('keeps conditional formatting background on sticky columns', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <table>
          <tbody>
            <tr>
              <PurchaseOrderDataCell
                cell={{ column: { ...COLUMN, stickyLeft: 0 }, rawValue: 'Done' }}
                layout={{
                  className: 'cell',
                  style: { backgroundColor: '#00c875', color: '#ffffff' },
                }}
              >
                Done
              </PurchaseOrderDataCell>
            </tr>
          </tbody>
        </table>
      </FluentProvider>
    );

    const cell = screen.getByText('Done').closest('td');
    expect(cell.style.backgroundColor).toBe('rgb(0, 200, 117)');
    expect(cell.style.color).toBe('rgb(255, 255, 255)');
    expect(cell.style.position).toBe('sticky');
    expect(cell.style.left).toBe('0px');
  });
});
