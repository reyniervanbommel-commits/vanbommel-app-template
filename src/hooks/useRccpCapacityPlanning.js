import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

function buildCapacityQuery(vendorAccount) {
  if (!vendorAccount) return '/rccp/capacity';
  const params = new URLSearchParams({ vendorAccount });
  return `/rccp/capacity?${params.toString()}`;
}

export function createEmptyCapacityRow() {
  return {
    localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    vendorAccount: '',
    periodYear: new Date().getFullYear(),
    isoWeek: 1,
    capacityCategory: '',
    availableQty: 0,
    isNew: true,
  };
}

export function useRccpCapacityPlanning({ vendorAccount = '', enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [rowError, setRowError] = useState('');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(buildCapacityQuery(vendorAccount || undefined));
      if (requestId !== requestIdRef.current) return;
      setRows((data.rows || []).map((row) => ({ ...row, localKey: String(row.id) })));
      setReadOnly(Boolean(data.readOnly));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load capacity planning data');
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, vendorAccount]);

  useEffect(() => { load(); }, [load]);

  const addEmptyRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyCapacityRow()]);
  }, []);

  const updateRow = useCallback((localKey, field, value) => {
    setRows((prev) => prev.map((row) => (
      row.localKey === localKey ? { ...row, [field]: value } : row
    )));
  }, []);

  const removeRow = useCallback((localKey) => {
    setRows((prev) => prev.filter((row) => row.localKey !== localKey));
  }, []);

  const saveRow = useCallback(async (row) => {
    setRowError('');
    const payload = {
      vendorAccount: String(row.vendorAccount || '').trim(),
      periodYear: Number(row.periodYear),
      isoWeek: Number(row.isoWeek),
      capacityCategory: String(row.capacityCategory || '').trim(),
      availableQty: Number(row.availableQty),
    };

    try {
      if (row.id) {
        const data = await apiRequest(`/rccp/capacity/${row.id}`, {
          method: 'PUT',
          body: payload,
        });
        setRows((prev) => prev.map((item) => (
          item.localKey === row.localKey
            ? { ...data.row, localKey: String(data.row.id) }
            : item
        )));
      } else {
        const data = await apiRequest('/rccp/capacity', {
          method: 'POST',
          body: payload,
        });
        setRows((prev) => prev.map((item) => (
          item.localKey === row.localKey
            ? { ...data.row, localKey: String(data.row.id), isNew: false }
            : item
        )));
      }
      return true;
    } catch (err) {
      setRowError(err.message || 'Failed to save capacity row');
      return false;
    }
  }, []);

  const deleteRow = useCallback(async (row) => {
    setRowError('');
    if (!row.id) {
      removeRow(row.localKey);
      return true;
    }

    try {
      await apiRequest(`/rccp/capacity/${row.id}`, { method: 'DELETE' });
      removeRow(row.localKey);
      return true;
    } catch (err) {
      setRowError(err.message || 'Failed to delete capacity row');
      return false;
    }
  }, [removeRow]);

  return {
    rows,
    loading,
    error,
    readOnly,
    rowError,
    setRowError,
    reload: load,
    addEmptyRow,
    updateRow,
    saveRow,
    deleteRow,
  };
}
