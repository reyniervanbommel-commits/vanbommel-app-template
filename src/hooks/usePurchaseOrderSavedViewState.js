import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import {
  ALL_ORDERS_SETTINGS_BOARD_KEY,
  describeHistoryToggle,
  readAllOrdersHistoryFromSettings,
} from '../utils/allOrdersHistoryPreference';
import { usePurchaseOrderSavedViews } from './usePurchaseOrderSavedViews';

const BOARD_KEY = 'purchase-orders';

function normalizeForComparison(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForComparison(entry));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeForComparison(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableSerialize(value) {
  return JSON.stringify(normalizeForComparison(value));
}

function pickStartupView(views, isSupplier) {
  const personalViews = views.filter((view) => view.scope === 'personal');
  const vendorViews = views.filter((view) => view.scope === 'vendor');
  const globalViews = views.filter((view) => view.scope === 'global');

  if (isSupplier) {
    return vendorViews.find((view) => view.isDefault)
      || vendorViews[0]
      || personalViews.find((view) => view.isDefault)
      || personalViews[0]
      || null;
  }

  return personalViews.find((view) => view.isDefault)
    || globalViews.find((view) => view.isDefault)
    || vendorViews.find((view) => view.isDefault)
    || null;
}

/**
 * Bundelt saved-view state en handlers voor de purchase-order board.
 */
export function usePurchaseOrderSavedViewState({
  orders,
  loading,
  exportColumnLayout,
  applyColumnLayout,
  boardView,
  isSupplier = false,
}) {
  const savedViews = usePurchaseOrderSavedViews({ boardKey: BOARD_KEY });
  const [activeViewId, setActiveViewId] = useState(null);
  const [savedStateFingerprint, setSavedStateFingerprint] = useState(null);
  const [stickyColumnKeys, setStickyColumnKeys] = useState([]);
  const [showHistoryIndicators, setShowHistoryIndicators] = useState(true);
  const [allOrdersShowHistoryIndicators, setAllOrdersShowHistoryIndicators] = useState(true);
  const autoAppliedRef = useRef(false);
  const activeViewIdRef = useRef(activeViewId);
  const allOrdersDirtyRef = useRef(false);
  activeViewIdRef.current = activeViewId;

  const buildCurrentViewState = useCallback(() => ({
    showHistoryIndicators,
    columns: {
      ...exportColumnLayout(),
      stickyColumnKeys,
    },
    table: boardView.exportFilterSortGrouping(),
  }), [exportColumnLayout, boardView, stickyColumnKeys, showHistoryIndicators]);

  const buildCurrentFingerprint = useCallback(
    () => stableSerialize(buildCurrentViewState()),
    [buildCurrentViewState]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!activeViewId || !savedStateFingerprint) return false;
    return buildCurrentFingerprint() !== savedStateFingerprint;
  }, [activeViewId, savedStateFingerprint, buildCurrentFingerprint]);

  const applyViewState = useCallback((view) => {
    const state = view?.viewState || {};
    applyColumnLayout(state.columns);
    setStickyColumnKeys(Array.isArray(state.columns?.stickyColumnKeys) ? state.columns.stickyColumnKeys : []);
    boardView.applyFilterSortGrouping(state.table);
    setShowHistoryIndicators(state.showHistoryIndicators !== false);
    setActiveViewId(view?.id ?? null);
    setSavedStateFingerprint(view?.id ? stableSerialize(state) : null);
  }, [applyColumnLayout, boardView]);

  const persistAllOrdersHistory = useCallback((enabled) => {
    allOrdersDirtyRef.current = true;
    void apiRequest(`/supplier/board-settings/${ALL_ORDERS_SETTINGS_BOARD_KEY}`, {
      method: 'PATCH',
      body: { settings: { allOrdersShowHistoryIndicators: Boolean(enabled) } },
    }).catch(() => {});
  }, []);

  const handleResetView = useCallback(() => {
    boardView.clearAllFilters();
    boardView.clearSort();
    boardView.clearGrouping();
    boardView.clearGroupSummaries();
    setShowHistoryIndicators(allOrdersShowHistoryIndicators);
    setActiveViewId(null);
    setSavedStateFingerprint(null);
  }, [boardView, allOrdersShowHistoryIndicators]);

  const handleSaveAsNew = useCallback(async ({ name, scope, isDefault }) => {
    const currentState = buildCurrentViewState();
    const currentFingerprint = stableSerialize(currentState);
    const created = await savedViews.createView({
      name,
      scope,
      viewState: currentState,
      isDefault,
    });
    if (created?.id) {
      setActiveViewId(created.id);
      setSavedStateFingerprint(currentFingerprint);
    }
  }, [savedViews, buildCurrentViewState]);

  const handleUpdateActive = useCallback(async (view) => {
    const currentState = buildCurrentViewState();
    await savedViews.updateView(view.id, { viewState: currentState });
    setSavedStateFingerprint(stableSerialize(currentState));
  }, [savedViews, buildCurrentViewState]);

  const handleRenameView = useCallback(async (view, name) => {
    await savedViews.updateView(view.id, { name });
  }, [savedViews]);

  const handleSetDefault = useCallback(async (view) => {
    await savedViews.updateView(view.id, { isDefault: true });
  }, [savedViews]);

  const handleDeleteView = useCallback(async (view) => {
    await savedViews.deleteView(view.id);
    if (view.id === activeViewId) {
      setShowHistoryIndicators(allOrdersShowHistoryIndicators);
      setActiveViewId(null);
      setSavedStateFingerprint(null);
    }
  }, [savedViews, activeViewId, allOrdersShowHistoryIndicators]);

  const handleToggleShowHistory = useCallback(async (view, enabled) => {
    const nextEnabled = Boolean(enabled);
    const decision = describeHistoryToggle({
      view,
      activeViewId,
      enabled: nextEnabled,
      allOrdersPreference: allOrdersShowHistoryIndicators,
    });
    if (decision.updateLive) {
      setShowHistoryIndicators(nextEnabled);
    }
    if (!decision.persistView) {
      setAllOrdersShowHistoryIndicators(decision.nextAllOrdersPreference);
      persistAllOrdersHistory(decision.nextAllOrdersPreference);
      return;
    }
    const nextViewState = {
      ...(view?.viewState || {}),
      showHistoryIndicators: nextEnabled,
    };
    await savedViews.updateView(view.id, { viewState: nextViewState });
    if (decision.updateLive) {
      setSavedStateFingerprint(stableSerialize(nextViewState));
    }
  }, [activeViewId, allOrdersShowHistoryIndicators, persistAllOrdersHistory, savedViews]);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/supplier/board-settings/${ALL_ORDERS_SETTINGS_BOARD_KEY}`)
      .then((data) => {
        if (cancelled || allOrdersDirtyRef.current) return;
        const next = readAllOrdersHistoryFromSettings(data?.settings);
        setAllOrdersShowHistoryIndicators(next);
        if (activeViewIdRef.current == null) {
          setShowHistoryIndicators(next);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    const boardReady = !savedViews.loading && !loading && (isSupplier || orders.length > 0);
    if (!boardReady) return;
    autoAppliedRef.current = true;
    const defaultView = pickStartupView(savedViews.views, isSupplier);
    if (defaultView) {
      applyViewState(defaultView);
    }
  }, [savedViews.loading, savedViews.views, loading, orders.length, applyViewState, isSupplier]);

  return useMemo(() => ({
    savedViews,
    activeViewId,
    applyViewState,
    handleResetView,
    handleSaveAsNew,
    handleUpdateActive,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
    handleToggleShowHistory,
    hasUnsavedChanges,
    showHistoryIndicators,
    allOrdersShowHistoryIndicators,
    stickyColumnKeys,
    setStickyColumnKeys,
  }), [
    savedViews,
    activeViewId,
    applyViewState,
    handleResetView,
    handleSaveAsNew,
    handleUpdateActive,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
    handleToggleShowHistory,
    hasUnsavedChanges,
    showHistoryIndicators,
    allOrdersShowHistoryIndicators,
    stickyColumnKeys,
    setStickyColumnKeys,
  ]);
}
