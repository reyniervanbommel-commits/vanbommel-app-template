import { useCallback, useEffect, useMemo, useState } from 'react';
import { collectRccpChartItemNumbers, filterRccpChartByItem } from './rccpChartItems';

/**
 * Unique-item filter for RCCP PO stacks.
 * @param {object[]} chart
 */
export function useRccpItemFilter(chart) {
  const [itemNumber, setItemNumber] = useState('');
  const items = useMemo(() => collectRccpChartItemNumbers(chart), [chart]);

  useEffect(() => {
    if (itemNumber && !items.includes(itemNumber)) setItemNumber('');
  }, [items, itemNumber]);

  const handleItemChange = useCallback((next) => {
    setItemNumber(next || '');
  }, []);

  const resetItem = useCallback(() => setItemNumber(''), []);

  const filteredChart = useMemo(
    () => filterRccpChartByItem(chart, itemNumber),
    [chart, itemNumber],
  );

  return { itemNumber, items, filteredChart, handleItemChange, resetItem };
}
