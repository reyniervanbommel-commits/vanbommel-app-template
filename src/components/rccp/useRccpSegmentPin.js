import { useCallback, useEffect, useState } from 'react';

/**
 * Pin state for an RCCP stack click. All items unpins; click sets the item filter.
 * @param {{ itemNumber: string, onItemChange: (value: string) => void }} args
 */
export function useRccpSegmentPin({ itemNumber = '', onItemChange } = {}) {
  const [pin, setPin] = useState(null);

  const closePin = useCallback(() => setPin(null), []);

  useEffect(() => {
    if (!itemNumber) setPin(null);
  }, [itemNumber]);

  const onSegmentClick = useCallback((payload) => {
    const sku = String(payload?.segment?.itemNumber || '').trim();
    if (!sku) return;
    onItemChange?.(sku);
    setPin({
      itemNumber: sku,
      x: payload.x,
      y: payload.y,
      segment: payload.segment,
      label: payload.label,
    });
  }, [onItemChange]);

  return { pin, closePin, onSegmentClick };
}
