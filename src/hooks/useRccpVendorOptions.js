import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Loads distinct vendor values from the purchase-orders main table
 * using the vendor column configured in RCCP settings.
 */
export function useRccpVendorOptions() {
  const [vendors, setVendors] = useState([]);
  const [vendorColumnKey, setVendorColumnKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/rccp/vendors');
      setVendors(Array.isArray(data?.vendors) ? data.vendors : []);
      setVendorColumnKey(data?.vendorColumnKey || '');
    } catch (err) {
      setVendors([]);
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { vendors, vendorColumnKey, loading, error, reload: load };
}
