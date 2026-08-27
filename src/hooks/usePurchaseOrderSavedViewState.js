import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import {
  ALL_ORDERS_SETTINGS_BOARD_KEY,
  describeHistoryToggle,
  readAllOrdersHistoryFromSettings,
} from '../utils/allOrdersHistoryPreference';
import { usePurchaseOrderSavedViews } from './usePurchaseOrderSavedViews';
import { usePurchaseOrderViewTabs } from './usePurchaseOrderViewTabs';
import { ALL_TAB_ID, normalizeTabsState } from '../utils/viewTabs';

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
  columns = [],
  datePeriodDisplayModes = {},
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
  const viewTabs = usePurchaseOrderViewTabs({
    activeViewId,
    boardView,
    columns,
    allItems: boardView.allItems || orders,
    datePeriodDisplayModes,
  });

  const buildCurrentViewState = useCallback(() => {
    const peek = viewTabs.peekTabsState();
    const table = boardView.exportFilterSortGrouping();
    return {
      showHistoryIndicators,
      vendorAccount: savedViews.views.find((view) => view.id === activeViewId)?.viewState?.vendorAccount || '',
      columns: {
        ...exportColumnLayout(),
        stickyColumnKeys,
      },
      table: {
        ...table,
        filterByColumn: peek.viewBaseFilters,
      },
      tabs: {
        extraTabs: peek.extraTabs,
        groups: peek.groups,
      },
    };
  }, [activeViewId, boardView, exportColumnLayout, savedViews.views, stickyColumnKeys, showHistoryIndicators, viewTabs]);

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
    if (view?.id) {
      viewTabs.loadFromViewState({ ...state, viewId: view.id });
      setSavedStateFingerprint(stableSerialize({
        ...state,
        vendorAccount: state.vendorAccount || '',
        tabs: normalizeTabsState(state.tabs),
      }));
    } else {
      viewTabs.resetTabs();
      setSavedStateFingerprint(null);
    }
  }, [applyColumnLayout, boardView, viewTabs]);

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
    boardView.columnSums?.clearColumnSums?.();
    setShowHistoryIndicators(allOrdersShowHistoryIndicators);
    setActiveViewId(null);
    setSavedStateFingerprint(null);
    viewTabs.resetTabs();
  }, [boardView, allOrdersShowHistoryIndicators, viewTabs]);

  const handleSaveAsNew = useCallback(async ({ name, scope, isDefault, vendorAccount }) => {
    const currentState = {
      ...buildCurrentViewState(),
      vendorAccount: vendorAccount || '',
      tabs: { extraTabs: [], groups: [] },
    };
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
      viewTabs.loadFromViewState({ ...currentState, viewId: created.id });
    }
    return created;
  }, [savedViews, buildCurrentViewState, viewTabs]);

  const handleUpdateActive = useCallback(async (view, saveScope = 'all') => {
    let extraTabs = viewTabs.peekTabsState().extraTabs;
    if (saveScope === 'group' && viewTabs.activeTabId !== ALL_TAB_ID) {
      extraTabs = viewTabs.applySaveScope('group');
    } else {
      viewTabs.snapshotCurrentTab();
      extraTabs = viewTabs.peekTabsState().extraTabs;
    }
    const currentState = {
      ...buildCurrentViewState(),
      tabs: { extraTabs, groups: viewTabs.groups },
    };
    await savedViews.updateView(view.id, { viewState: currentState });
    setSavedStateFingerprint(stableSerialize(currentState));
  }, [savedViews, buildCurrentViewState, viewTabs]);

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
      viewTabs.resetTabs();
    }
  }, [savedViews, activeViewId, allOrdersShowHistoryIndicators, viewTabs]);

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
    viewTabs,
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
    viewTabs,
  ]);
}
