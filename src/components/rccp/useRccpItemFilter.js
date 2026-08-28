import { useCallback, useEffect, useMemo, useState } from 'react';
import { collectRccpChartItemNumbers, filterRccpChartByItem } from './rccpChartItems';
import { useRccpItemLookup } from './useRccpItemLookup';

/**
 * Unique-item filter for RCCP PO stacks. Empty selection shows every item.
 * @param {object[]} chart
 * @param {string[]} extraColumnKeys
 */
export function useRccpItemFilter(chart, extraColumnKeys = []) {
  const [selectedItems, setSelectedItems] = useState([]);
  const items = useMemo(() => collectRccpChartItemNumbers(chart), [chart]);
  const lookup = useRccpItemLookup(items, extraColumnKeys);

  useEffect(() => {
    setSelectedItems((prev) => {
      const next = prev.filter((item) => items.includes(item));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  const handleItemChange = useCallback((next) => {
    const values = Array.isArray(next) ? next : [next];
    setSelectedItems(values.map((value) => String(value || '').trim()).filter(Boolean));
  }, []);

  const resetItem = useCallback(() => setSelectedItems([]), []);

  const filteredChart = useMemo(
    () => filterRccpChartByItem(chart, selectedItems),
    [chart, selectedItems],
  );

  return {
    selectedItems,
    items,
    filteredChart,
    handleItemChange,
    resetItem,
    extraColumns: lookup.columns,
    extraValues: lookup.byItem,
  };
}
