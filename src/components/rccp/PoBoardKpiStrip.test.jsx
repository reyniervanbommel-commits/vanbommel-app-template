// @vitest-environment jsdom
import React, { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import PoBoardKpiStrip from './PoBoardKpiStrip';

vi.mock('../../utils/poBoardKpiCache', () => ({
  getPoBoardKpis: vi.fn(),
  clearPoBoardKpiCache: vi.fn(),
}));

vi.mock('../../utils/api', () => ({
  apiRequest: vi.fn().mockResolvedValue({ settings: {} }),
}));

import { getPoBoardKpis } from '../../utils/poBoardKpiCache';

const PAYLOAD = {
  configured: true,
  sku: ['SKU-1'],
  orders: {
    'PO-A': { o: 10, d: 4, oi: [0] },
    'PO-B': { o: 3, oi: [0] },
  },
};

function BoardLikeHarness({ onFilter }) {
  const [orders, setOrders] = useState([
    { orderNumber: 'PO-A' },
    { orderNumber: 'PO-B' },
  ]);
  const [selectedKey, setSelectedKey] = useState('');
  const onKpiFilter = useCallback((key, matchKeys, options = {}) => {
    onFilter(key, matchKeys, options);
    setSelectedKey((prev) => (options.toggle !== false && prev === key ? '' : key));
    // Zelfde identiteitswisseling als het PO-board na overlay/match-update.
    setOrders((prev) => prev.map((order) => ({ ...order })));
  }, [onFilter]);
  return (
    <PoBoardKpiStrip
      orders={orders}
      selectedKey={selectedKey}
      onKpiFilter={onKpiFilter}
      refreshKey="rev-1"
    />
  );
}

describe('PoBoardKpiStrip', () => {
  it('does not loop when a KPI tile is clicked while the board recreates order rows', async () => {
    getPoBoardKpis.mockResolvedValue(PAYLOAD);
    const onFilter = vi.fn();
    onFilter.mockImplementation(() => {
      if (onFilter.mock.calls.length > 20) throw new Error('KPI filter update loop');
    });
    renderWithFluent(<BoardLikeHarness onFilter={onFilter} />);
    await waitFor(() => {
      expect(screen.getByText('Total ordered')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Total ordered'));
    await waitFor(() => {
      expect(onFilter.mock.calls.length).toBeGreaterThan(0);
    });
    const callsAfterClick = onFilter.mock.calls.length;
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(onFilter.mock.calls.length).toBe(callsAfterClick);
    expect(onFilter.mock.calls.length).toBeLessThan(5);
  });
});
