import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedBoard, setCachedBoard, clearCachedBoard } from './boardSessionStore';

describe('boardSessionStore', () => {
  beforeEach(() => {
    clearCachedBoard();
  });

  it('geeft null terug wanneer er niets gecached is', () => {
    expect(getCachedBoard()).toBeNull();
  });

  it('bewaart payload + revision atomair', () => {
    const payload = { orders: [{ orderNumber: 'PO-1' }] };
    setCachedBoard(payload, 'rev-abc');
    expect(getCachedBoard()).toEqual({ payload, revision: 'rev-abc' });
  });

  it('valt terug op null-revision wanneer geen revision is meegegeven', () => {
    setCachedBoard({ orders: [] });
    expect(getCachedBoard()).toEqual({ payload: { orders: [] }, revision: null });
  });

  it('negeert niet-object payloads', () => {
    setCachedBoard(null, 'rev');
    expect(getCachedBoard()).toBeNull();
    setCachedBoard('nope', 'rev');
    expect(getCachedBoard()).toBeNull();
  });

  it('overschrijft een eerdere cache bij een nieuwe read', () => {
    setCachedBoard({ orders: [1] }, 'rev-1');
    setCachedBoard({ orders: [1, 2] }, 'rev-2');
    expect(getCachedBoard()).toEqual({ payload: { orders: [1, 2] }, revision: 'rev-2' });
  });

  it('clearCachedBoard leegt de cache', () => {
    setCachedBoard({ orders: [] }, 'rev');
    clearCachedBoard();
    expect(getCachedBoard()).toBeNull();
  });
});
