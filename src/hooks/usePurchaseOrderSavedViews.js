import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Beheert de opgeslagen views van één board via de /supplier/board-views API.
 * Levert de zichtbare views (eigen personal + alle global) plus CRUD-acties.
 * Mutaties herladen de lijst (geen optimistic update) omdat default-wijzigingen
 * meerdere rijen raken en de server de bron van waarheid is.
 */
export function usePurchaseOrderSavedViews({ boardKey }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/board-views/' + boardKey);
      setViews(Array.isArray(data?.views) ? data.views : []);
    } catch (err) {
      setError(err.message);
      setViews([]);
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
