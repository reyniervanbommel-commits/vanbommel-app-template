export const ALL_ORDERS_SETTINGS_BOARD_KEY = 'purchase-orders-all-orders';

export function isAllOrdersToggle(view) {
  return !view || view.id == null || view.id === '';
}

export function resolveShowHistory(flag) {
  return flag !== false;
}

export function readAllOrdersHistoryFromSettings(settings) {
  return resolveShowHistory(settings?.allOrdersShowHistoryIndicators);
}

/**
 * Bepaalt wat er gebeurt als de history-toggle wordt gezet.
 * All orders heeft geen view-id; saved views blijven via viewState persisten.
 */
export function describeHistoryToggle({ view, activeViewId, enabled, allOrdersPreference }) {
  const nextEnabled = Boolean(enabled);
  if (isAllOrdersToggle(view)) {
    return {
      persistView: false,
      updateLive: activeViewId == null,
      nextAllOrdersPreference: nextEnabled,
    };
  }
  return {
    persistView: true,
    updateLive: view.id === activeViewId,
    nextAllOrdersPreference: allOrdersPreference,
  };
}
