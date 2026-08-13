import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useBoardRevisionGate } from './useBoardRevisionGate';
import { apiRequest } from '../utils/api';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

beforeEach(() => {
  apiRequest.mockReset();
});

describe('useBoardRevisionGate', () => {
  it('checkt niet automatisch bij de eerste render zonder runOnMount', () => {
    renderHook(() => useBoardRevisionGate({ active: true }));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('checkt automatisch bij runOnMount op de eerste actieve render', async () => {
    apiRequest.mockResolvedValue({ revision: 'rev-1' });
    const { result } = renderHook(() => useBoardRevisionGate({ active: true, runOnMount: true }));
    await waitFor(() => expect(result.current.revision).toBe('rev-1'));
    expect(apiRequest).toHaveBeenCalledWith('/data/purchase-orders/revision');
  });

  it('checkt bij de inactief-naar-actief-transitie (terugkeer naar de pagina)', async () => {
    apiRequest.mockResolvedValue({ revision: 'rev-2' });
    const { result, rerender } = renderHook(
      ({ active }) => useBoardRevisionGate({ active }),
      { initialProps: { active: false } },
    );
    expect(apiRequest).not.toHaveBeenCalled();

    rerender({ active: true });
    await waitFor(() => expect(result.current.revision).toBe('rev-2'));
  });

  it('doet geen checks als enabled false is, ook niet bij een transitie', () => {
    const { rerender } = renderHook(
      ({ active }) => useBoardRevisionGate({ active, enabled: false }),
      { initialProps: { active: false } },
    );
    rerender({ active: true });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('roept onRevision aan met de nieuwe revisie', async () => {
    apiRequest.mockResolvedValue({ revision: 'rev-3' });
    const onRevision = vi.fn();
    renderHook(() => useBoardRevisionGate({ active: true, runOnMount: true, onRevision }));
    await waitFor(() => expect(onRevision).toHaveBeenCalledWith('rev-3'));
  });

  it('zet een foutmelding en reset checking bij een mislukte call', async () => {
    apiRequest.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useBoardRevisionGate({ active: true, runOnMount: true }));
    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.checking).toBe(false);
    expect(result.current.revision).toBeNull();
  });

  it('geeft check() terug zodat de consument handmatig kan verversen', async () => {
    apiRequest.mockResolvedValue({ revision: 'manual-rev' });
    const { result } = renderHook(() => useBoardRevisionGate({ active: true }));

    let returned;
    await act(async () => { returned = await result.current.check(); });

    expect(returned).toBe('manual-rev');
    expect(result.current.revision).toBe('manual-rev');
  });
});
