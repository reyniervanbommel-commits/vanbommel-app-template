import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { getCachedBoardViews, setCachedBoardViews } from '../utils/boardPresentationCache';

/**
 * Beheert de opgeslagen views van één board via de /supplier/board-views API.
 * Levert de zichtbare views (eigen personal + alle global) plus CRUD-acties.
 * Mutaties herladen de lijst (geen optimistic update) omdat default-wijzigingen
 * meerdere rijen raken en de server de bron van waarheid is.
 *
 * Bij terugkeer binnen dezelfde sessie worden de views uit boardPresentationCache geseed, zodat
 * de default-view (grouping/kolommen) al bij de eerste paint kan worden toegepast i.p.v. een tel
 * later "bij te trekken". De achtergrond-refetch blijft de bron van waarheid.
 */
export function usePurchaseOrderSavedViews({ boardKey }) {
  const [views, setViews] = useState(() => getCachedBoardViews(boardKey) || []);
  const [loading, setLoading] = useState(() => !getCachedBoardViews(boardKey));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    // Met een sessie-cache verversen we op de achtergrond (geen loading-flip), zodat de
    // startup-view direct kan worden toegepast en er geen zichtbare regroep-flits ontstaat.
    const hasCache = Boolean(getCachedBoardViews(boardKey));
    if (!hasCache) setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/board-views/' + boardKey);
      const nextViews = Array.isArray(data?.views) ? data.views : [];
      setViews(nextViews);
      setCachedBoardViews(boardKey, nextViews);
    } catch (err) {
      setError(err.message);
      if (!hasCache) setViews([]);
    } finally {
      setLoading(false);
    }
  }, [boardKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createView = useCallback(async ({ name, scope, viewState, isDefault }) => {
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/board-views/' + boardKey, {
        method: 'POST',
        body: { name, scope, viewState, isDefault: Boolean(isDefault) },
      });
      await reload();
      return data?.view || null;
    } finally {
      setSaving(false);
    }
  }, [boardKey, reload]);

  const updateView = useCallback(async (viewId, patch) => {
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/board-views/' + boardKey + '/' + viewId, {
        method: 'PATCH',
        body: patch,
      });
      await reload();
      return data?.view || null;
    } finally {
      setSaving(false);
    }
  }, [boardKey, reload]);

  const deleteView = useCallback(async (viewId) => {
    setSaving(true);
    setError('');
    try {
      await apiRequest('/supplier/board-views/' + boardKey + '/' + viewId, { method: 'DELETE' });
      await reload();
    } finally {
      setSaving(false);
    }
  }, [boardKey, reload]);

  return useMemo(() => ({
    views,
    loading,
    error,
    saving,
    reload,
    createView,
    updateView,
    deleteView,
  }), [views, loading, error, saving, reload, createView, updateView, deleteView]);
}
