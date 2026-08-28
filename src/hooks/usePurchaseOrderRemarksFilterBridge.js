import { useEffect, useMemo } from 'react';
import { isRemarksSearchTermValid } from '../utils/tableViewFilterUtils';
import { useRemarksColumnFilter } from '../components/supplier/remarks/useRemarksColumnFilter';
import { useAppToast } from './useAppToast';

/**
 * Derives remarks search enabled/query from filterByColumn and toasts search errors.
 * @param {Record<string, { operator?: string, value?: string }>|null|undefined} filterByColumn
 * @returns {{ matchKeys: Set<string>|null, enabled: boolean }}
 */
export function usePurchaseOrderRemarksFilterBridge(filterByColumn) {
  const { notifyError } = useAppToast();
  const query = String(filterByColumn?.remarks?.value || '').trim();
  const enabled = filterByColumn?.remarks?.operator === 'contains' && isRemarksSearchTermValid(query);
  const result = useRemarksColumnFilter({ query, enabled });

  useEffect(() => {
    if (result.error) notifyError(result.error);
  }, [notifyError, result.error]);

  return useMemo(
    () => ({ matchKeys: result.matchKeys, enabled }),
    [enabled, result.matchKeys]
  );
}
