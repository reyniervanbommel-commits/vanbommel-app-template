import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedBoardViews,
  setCachedBoardViews,
  getCachedBoardSettings,
  setCachedBoardSettings,
  clearBoardPresentationCache,
} from './boardPresentationCache';

describe('boardPresentationCache', () => {
  beforeEach(() => {
    clearBoardPresentationCache();
  });

  it('geeft null terug wanneer er niets gecached is', () => {
    expect(getCachedBoardViews('purchase-orders')).toBeNull();
    expect(getCachedBoardSettings('purchase-orders')).toBeNull();
  });

  it('bewaart en leest saved views per board', () => {
    const views = [{ id: 1, name: 'Default' }];
    setCachedBoardViews('purchase-orders', views);
    expect(getCachedBoardViews('purchase-orders')).toEqual(views);
    expect(getCachedBoardViews('other-board')).toBeNull();
  });

  it('bewaart en leest board-settings per board', () => {
    const settings = { visibleColumnKeys: ['status'], columnOrder: ['status', 'vendor'] };
    setCachedBoardSettings('purchase-orders', settings);
    expect(getCachedBoardSettings('purchase-orders')).toEqual(settings);
  });

  it('negeert ongeldige input', () => {
    setCachedBoardViews('', [{ id: 1 }]);
    setCachedBoardViews('purchase-orders', 'not-an-array');
    expect(getCachedBoardViews('purchase-orders')).toBeNull();
    setCachedBoardSettings('purchase-orders', null);
    expect(getCachedBoardSettings('purchase-orders')).toBeNull();
  });

  it('clear leegt beide caches', () => {
    setCachedBoardViews('purchase-orders', [{ id: 1 }]);
    setCachedBoardSettings('purchase-orders', { visibleColumnKeys: [] });
    clearBoardPresentationCache();
    expect(getCachedBoardViews('purchase-orders')).toBeNull();
    expect(getCachedBoardSettings('purchase-orders')).toBeNull();
  });
});
