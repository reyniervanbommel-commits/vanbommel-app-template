import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import {
  getCachedRccpConfig,
  publishRccpSettingsSync,
  subscribeRccpSettingsSync,
} from './rccpSettingsSync';

const PO_TABLE = 'purchase-orders';

export function useRccpSettings() {
  const [config, setConfig] = useState(() => getCachedRccpConfig());
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settings, masterCols, detailCols] = await Promise.all([
        apiRequest('/admin/rccp/settings'),
        apiRequest(`/data/${PO_TABLE}/columns?scope=master`),
        apiRequest(`/data/${PO_TABLE}/columns?scope=detail`),
      ]);
      const nextConfig = settings.config;
      publishRccpSettingsSync(nextConfig);
      setConfig(nextConfig);
      setColumns([
        ...(masterCols.columns || []).map((c) => ({ ...c, scope: 'master' })),
        ...(detailCols.columns || []).map((c) => ({ ...c, scope: 'detail' })),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load RCCP settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return subscribeRccpSettingsSync((nextConfig) => {
      setConfig(nextConfig);
      setSaved(false);
    });
  }, []);

  const updateField = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    if (!config) return false;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await apiRequest('/admin/rccp/settings', { method: 'PUT', body: config });
      publishRccpSettingsSync(result.config);
      setConfig(result.config);
      setSaved(true);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save RCCP settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [config]);

  const statusOptions = useMemo(() => {
    const statusCol = columns.find((c) => c.key === 'status' || c.key === 'purchaseOrderStatus');
    return Array.isArray(statusCol?.options) ? statusCol.options : [];
  }, [columns]);

  return {
    config, columns, loading, saving, error, saved, statusOptions, updateField, save, reload: load,
  };
}
