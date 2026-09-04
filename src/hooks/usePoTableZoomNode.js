import { useCallback, useEffect, useRef } from 'react';
import { applyPoTableZoom, subscribePoTableZoom } from '../utils/poTableZoom';

/**
 * Binds `--po-table-zoom` to a DOM node and keeps it in sync with the store.
 *
 * @returns {(node: HTMLElement|null) => void} callback ref
 */
export function usePoTableZoomNode() {
  const nodeRef = useRef(null);
  const unsubRef = useRef(null);

  const setNode = useCallback((node) => {
    if (nodeRef.current && unsubRef.current) unsubRef.current();
    unsubRef.current = null;
    nodeRef.current = node;
    if (!node) return;
    applyPoTableZoom(node);
    unsubRef.current = subscribePoTableZoom(() => applyPoTableZoom(node));
  }, []);

  useEffect(() => () => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  return setNode;
}
