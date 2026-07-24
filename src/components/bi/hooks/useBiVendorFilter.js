import { useEffect, useMemo, useState } from 'react';
import { useRccpVendorOptions } from '../../../hooks/useRccpVendorOptions';
import {
  resolveDefaultRccpVendor,
  resolveRccpVendorFromFilter,
} from '../../rccp/resolveRccpVendorFilter';
import { readPoFilterByColumnForRccp } from '../../../utils/poVendorFilterHandoff';

/**
 * Vendor filter voor de BI-pagina. Herbruikt de RCCP-vendorlijst en neemt bij openen
 * dezelfde vendor over waarop de gebruiker net op het PO-board filterde (sessionStorage-handoff).
 *
 * @returns {{
 *   vendorAccount: string,
 *   setVendorAccount: (value: string) => void,
 *   vendors: string[],
 *   vendorNames: Record<string, string>,
 *   loading: boolean,
 *   error: string,
 *   hadPoFilterHandoff: boolean,
 *   externalFilterByColumn: Record<string, { operator: string, value: string }> | undefined,
 * }}
 */
export function useBiVendorFilter() {
  // null = nog niet geresolved; '' = expliciet "All vendors" (geen filter)
  const [vendorAccount, setVendorAccount] = useState(null);
  const {
    vendors, vendorNames, vendorColumnKey, loading, error,
  } = useRccpVendorOptions();

  // Eenmalig bij mount: had het PO-board een actief vendor-filter (nr of naam)?
  const [hadPoFilterHandoff] = useState(() => (
    Boolean(resolveRccpVendorFromFilter(readPoFilterByColumnForRccp()))
  ));

  // Neem de vendor over waarop het PO-board net gefilterd was; anders '' (All vendors).
  useEffect(() => {
    if (loading || vendorAccount !== null) return;
    const filterByColumn = readPoFilterByColumnForRccp();
    setVendorAccount(resolveDefaultRccpVendor({ vendors, vendorNames, filterByColumn }));
  }, [loading, vendors, vendorNames, vendorAccount]);

  // Vertaal de gekozen vendor naar het filter-formaat dat useChartData/biAggregate verwacht.
  const externalFilterByColumn = useMemo(() => {
    if (!vendorAccount || !vendorColumnKey) return undefined;
    return { [vendorColumnKey]: { operator: 'equals', value: vendorAccount } };
  }, [vendorAccount, vendorColumnKey]);

  return {
    vendorAccount: vendorAccount || '',
    setVendorAccount,
    vendors,
    vendorNames,
    loading,
    error,
    hadPoFilterHandoff,
    externalFilterByColumn,
  };
}
