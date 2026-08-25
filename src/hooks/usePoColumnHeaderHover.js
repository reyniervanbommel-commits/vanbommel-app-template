import { useCallback, useEffect, useRef, useState } from 'react';

export const PO_HEADER_HOVER_DELAY_MS = 280;

function readColumnCell(element) {
  if (!(element instanceof Element)) return null;
  if (element.getAttribute('data-collapsed-column') === 'true') return null;
  if (!element.getAttribute('data-col-key')) return null;
  return element;
}

/**
 * Single delayed hover for the PO header row. State stays out of body rows.
 *
 * @param {{ disabled?: boolean }} options
 * @returns {{
 *   hover: { columnKey: string, top: number, left: number } | null,
 *   enter: (cell: Element | null) => void,
 *   hide: () => void,
 *   onMouseOver: (event: MouseEvent) => void,
 *   onMouseOut: (event: MouseEvent) => void,
 *   onMouseDown: () => void,
 * }}
 */
export function usePoColumnHeaderHover({ disabled = false } = {}) {
  const [hover, setHover] = useState(null);
  const timerRef = useRef(null);
  const pendingKeyRef = useRef('');
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const clearTimer = useCallback(() => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    pendingKeyRef.current = '';
    setHover(null);
  }, [clearTimer]);

  const enter = useCallback((cell) => {
    if (disabledRef.current) return;
    const target = readColumnCell(cell);
    const columnKey = target?.getAttribute('data-col-key');
    if (!columnKey) return;
    if (pendingKeyRef.current === columnKey) return;
    clearTimer();
    pendingKeyRef.current = columnKey;
    setHover(null);
    timerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setHover({
        columnKey,
        top: Math.round(rect.bottom + 6),
        left: Math.round(rect.left),
      });
    }, PO_HEADER_HOVER_DELAY_MS);
  }, [clearTimer]);

  const onMouseOver = useCallback((event) => {
    const cell = event.target instanceof Element
      ? event.target.closest('[data-col-key]')
      : null;
    if (!cell || !event.currentTarget.contains(cell)) return;
    enter(cell);
  }, [enter]);

  const onMouseOut = useCallback((event) => {
    const next = event.relatedTarget instanceof Element
      ? event.relatedTarget.closest('[data-col-key]')
      : null;
    if (next && event.currentTarget.contains(next)) {
      enter(next);
      return;
    }
    hide();
  }, [enter, hide]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  useEffect(() => {
    if (!hover) return undefined;
    const onScroll = () => hide();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [hide, hover]);

  return { hover, enter, hide, onMouseOver, onMouseOut, onMouseDown: hide };
}
