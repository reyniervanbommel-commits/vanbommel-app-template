// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRccpChartVisibility } from './useRccpChartVisibility';

const orderedRows = [
  { measureKey: 'open', label: 'Open' },
  { measureKey: 'received', label: 'Received' },
];

// Stabiele referenties buiten de test: een nieuw object-literal per render zou de
// hydratie-effect (deps op `visibility`) telkens opnieuw laten afgaan.
const NOT_READY = { ready: false };

describe('useRccpChartVisibility', () => {
  it('hydrates default visibility for every row when no board settings are saved', () => {
    const { result } = renderHook(() => useRccpChartVisibility({ orderedRows }));
    expect(Object.keys(result.current.visibleKeys)).toEqual(
      expect.arrayContaining(['open', 'received']),
    );
  });

  it('toggles a row and reports the change upstream', () => {
    const onChange = vi.fn();
    const visibility = { ready: true, savedKeys: {}, onChange };
    const { result } = renderHook(() => useRccpChartVisibility({ orderedRows, visibility }));
    act(() => {
      result.current.handleToggle('open', false);
    });
    expect(result.current.visibleKeys.open).toBe(false);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ open: false }));
  });

  it('resets to defaults while visibility is not ready yet', () => {
    const ready = { ready: true, savedKeys: { open: false } };
    const { result, rerender } = renderHook(
      ({ visibility }) => useRccpChartVisibility({ orderedRows, visibility }),
      { initialProps: { visibility: NOT_READY } },
    );
    expect(result.current.visibleKeys.open).toBeDefined();
    rerender({ visibility: ready });
    expect(result.current.visibleKeys.open).toBe(false);
  });
});
