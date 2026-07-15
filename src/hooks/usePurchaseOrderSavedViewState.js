import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const autoAppliedRef = useRef(false);
  const activeView = useMemo(
    () => savedViews.views.find((view) => view.id === activeViewId) || null,
    [savedViews.views, activeViewId]
  );

  const buildCurrentViewState = useCallback(() => ({
    columns: {
      ...exportColumnLayout(),
      stickyColumnKeys,
    },
    table: boardView.exportFilterSortGrouping(),
  }), [exportColumnLayout, boardView, stickyColumnKeys]);

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
    setActiveViewId(view?.id ?? null);
    setSavedStateFingerprint(view?.id ? stableSerialize(state) : null);
  }, [applyColumnLayout, boardView]);

  const handleResetView = useCallback(() => {
    boardView.clearAllFilters();
    boardView.clearSort();
    boardView.clearGrouping();
    boardView.clearGroupSummaries();
    setActiveViewId(null);
    setSavedStateFingerprint(null);
  }, [boardView]);

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
      setActiveViewId(null);
      setSavedStateFingerprint(null);
    }
  }, [savedViews, activeViewId]);

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
    hasUnsavedChanges,
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
    hasUnsavedChanges,
    stickyColumnKeys,
    setStickyColumnKeys,
  ]);
}
