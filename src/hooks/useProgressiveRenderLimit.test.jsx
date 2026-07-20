import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProgressiveRenderLimit } from './useProgressiveRenderLimit';

describe('useProgressiveRenderLimit', () => {
  it('start met een schermvullend blok en groeit door tot alles gemount is', async () => {
    const { result } = renderHook(() => useProgressiveRenderLimit(400, 'view-1'));

    expect(result.current).toBe(50);
    await waitFor(() => expect(result.current).toBe(400));
  });

  it('begrenst niet als er minder rijen zijn dan het eerste blok', () => {
    const { result } = renderHook(() => useProgressiveRenderLimit(12, 'view-1'));
    expect(result.current).toBe(12);
  });

  it('begint opnieuw bij een andere filter/sortering', async () => {
    const { result, rerender } = renderHook(
      ({ key }) => useProgressiveRenderLimit(400, key),
      { initialProps: { key: 'view-1' } }
    );
    await waitFor(() => expect(result.current).toBe(400));

    rerender({ key: 'view-2' });
    expect(result.current).toBe(50);
  });

  it('mount alles ineens als er een rij gezocht wordt', () => {
    const { result } = renderHook(() => useProgressiveRenderLimit(400, 'view-1', true));
    expect(result.current).toBe(400);
  });
});
