import { describe, expect, it } from 'vitest';
import {
  ALL_ORDERS_SETTINGS_BOARD_KEY,
  describeHistoryToggle,
  isAllOrdersToggle,
  readAllOrdersHistoryFromSettings,
  resolveShowHistory,
} from './allOrdersHistoryPreference';

describe('isAllOrdersToggle', () => {
  it('herkent All orders (geen view-id)', () => {
    expect(isAllOrdersToggle(null)).toBe(true);
    expect(isAllOrdersToggle({ id: null })).toBe(true);
    expect(isAllOrdersToggle({ id: '' })).toBe(true);
  });

  it('herkent een opgeslagen view', () => {
    expect(isAllOrdersToggle({ id: 12 })).toBe(false);
  });
});

describe('readAllOrdersHistoryFromSettings', () => {
  it('staat standaard aan als er geen setting is', () => {
    expect(readAllOrdersHistoryFromSettings(null)).toBe(true);
    expect(readAllOrdersHistoryFromSettings({})).toBe(true);
  });

  it('leest een uitgezette All-orders-voorkeur', () => {
    expect(readAllOrdersHistoryFromSettings({ allOrdersShowHistoryIndicators: false })).toBe(false);
  });
});

describe('describeHistoryToggle', () => {
  it('zet All orders lokaal zonder view-persist, en live als All orders actief is', () => {
    expect(describeHistoryToggle({
      view: null,
      activeViewId: null,
      enabled: false,
      allOrdersPreference: true,
    })).toEqual({
      persistView: false,
      updateLive: true,
      nextAllOrdersPreference: false,
    });
  });

  it('wijzigt live history niet als All orders getoggeld wordt terwijl een andere view actief is', () => {
    expect(describeHistoryToggle({
      view: { id: null },
      activeViewId: 7,
      enabled: false,
      allOrdersPreference: true,
    })).toEqual({
      persistView: false,
      updateLive: false,
      nextAllOrdersPreference: false,
    });
  });

  it('persisteert een saved view en past live aan als die view actief is', () => {
    expect(describeHistoryToggle({
      view: { id: 7 },
      activeViewId: 7,
      enabled: false,
      allOrdersPreference: true,
    })).toEqual({
      persistView: true,
      updateLive: true,
      nextAllOrdersPreference: true,
    });
  });
});

describe('resolveShowHistory', () => {
  it('is aan tenzij expliciet false', () => {
    expect(resolveShowHistory(undefined)).toBe(true);
    expect(resolveShowHistory(false)).toBe(false);
  });
});

describe('ALL_ORDERS_SETTINGS_BOARD_KEY', () => {
  it('gebruikt een eigen board-key zodat kolomsettings niet overschreven worden', () => {
    expect(ALL_ORDERS_SETTINGS_BOARD_KEY).toBe('purchase-orders-all-orders');
  });
});
