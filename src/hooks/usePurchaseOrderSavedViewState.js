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

/**
 * Bundelt saved-view state en handlers voor de purchase-order board.
 */
export function usePurchaseOrderSavedViewState({
  orders,
  loading,
  exportColumnLayout,
  applyColumnLayout,
  boardView,
}) {
  const savedViews = usePurchaseOrderSavedViews({ boardKey: BOARD_KEY });
  const [activeViewId, setActiveViewId] = useState(null);
  const [savedStateFingerprint, setSavedStateFingerprint] = useState(null);
  const autoAppliedRef = useRef(false);
  const activeView = useMemo(
    () => savedViews.views.find((view) => view.id === activeViewId) || null,
    [savedViews.views, activeViewId]
  );

  const buildCurrentViewState = useCallback(() => ({
    columns: exportColumnLayout(),
    table: boardView.exportFilterSortGrouping(),
  }), [exportColumnLayout, boardView]);

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
    boardView.applyFilterSortGrouping(state.table);
    setActiveViewId(view?.id ?? null);
    setSavedStateFingerprint(view?.id ? stableSerialize(state) : null);
  }, [applyColumnLayout, boardView]);

  const handleResetView = useCallback(() => {
    boardView.clearAllFilters();
    boardView.clearSort();
    boardView.clearGrouping();
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
    if (savedViews.loading || loading || !orders.length) return;
    autoAppliedRef.current = true;
    const personalDefault = savedViews.views.find((view) => view.scope === 'personal' && view.isDefault);
    const globalDefault = savedViews.views.find((view) => view.scope === 'global' && view.isDefault);
    const defaultView = personalDefault || globalDefault;
    if (defaultView) {
      applyViewState(defaultView);
    }
  }, [savedViews.loading, savedViews.views, loading, orders.length, applyViewState]);

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
  ]);
}
