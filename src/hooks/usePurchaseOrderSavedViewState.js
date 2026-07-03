import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePurchaseOrderSavedViews } from './usePurchaseOrderSavedViews';

const BOARD_KEY = 'purchase-orders';

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
  const autoAppliedRef = useRef(false);

  const buildCurrentViewState = useCallback(() => ({
    columns: exportColumnLayout(),
    table: boardView.exportFilterSortGrouping(),
  }), [exportColumnLayout, boardView]);

  const applyViewState = useCallback((view) => {
    const state = view?.viewState || {};
    applyColumnLayout(state.columns);
    boardView.applyFilterSortGrouping(state.table);
    setActiveViewId(view?.id ?? null);
  }, [applyColumnLayout, boardView]);

  const handleResetView = useCallback(() => {
    boardView.clearAllFilters();
    boardView.clearSort();
    boardView.clearGrouping();
    setActiveViewId(null);
  }, [boardView]);

  const handleSaveAsNew = useCallback(async ({ name, scope, isDefault }) => {
    const created = await savedViews.createView({
      name,
      scope,
      viewState: buildCurrentViewState(),
      isDefault,
    });
    if (created?.id) setActiveViewId(created.id);
  }, [savedViews, buildCurrentViewState]);

  const handleUpdateActive = useCallback(async (view) => {
    await savedViews.updateView(view.id, { viewState: buildCurrentViewState() });
  }, [savedViews, buildCurrentViewState]);

  const handleRenameView = useCallback(async (view, name) => {
    await savedViews.updateView(view.id, { name });
  }, [savedViews]);

  const handleSetDefault = useCallback(async (view) => {
    await savedViews.updateView(view.id, { isDefault: true });
  }, [savedViews]);

  const handleDeleteView = useCallback(async (view) => {
    await savedViews.deleteView(view.id);
    if (view.id === activeViewId) setActiveViewId(null);
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
  ]);
}
