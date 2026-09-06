import { useCallback, useMemo, useRef, useState } from 'react';

/** Manual Y-axis zoom is clamped to a fifth and quintuple of the auto-fit extent — wide enough
 *  that bars can genuinely run off the top of the chart once zoomed in. */
export const RCCP_Y_SCALE_MIN_FACTOR = 0.2;
export const RCCP_Y_SCALE_MAX_FACTOR = 5;

/** Vertical drag distance (px) needed to double or halve the scale factor — smaller = bigger
 *  steps per pixel dragged. */
export const RCCP_Y_SCALE_PIXELS_PER_DOUBLING = 90;

/** Hold time before a pointer-down on the axis is treated as a scale drag, not a tap/scroll. */
export const RCCP_Y_SCALE_LONG_PRESS_MS = 350;

/**
 * Next zoom factor for a drag of `deltaY` px (positive = pointer moved down) starting from
 * `startFactor`. Dragging up shrinks `deltaY` below zero, which zooms in (factor grows).
 */
export function computeRccpYScaleFactor(startFactor, deltaY) {
  const base = Number(startFactor) || 1;
  const exponent = -(Number(deltaY) || 0) / RCCP_Y_SCALE_PIXELS_PER_DOUBLING;
  const next = base * (2 ** exponent);
  return Math.min(RCCP_Y_SCALE_MAX_FACTOR, Math.max(RCCP_Y_SCALE_MIN_FACTOR, next));
}

/** Applies a zoom factor to a `[min, max]` Y-domain (factor 1 = unchanged, auto-fit). */
export function scaleRccpYDomain(yDomain, factor) {
  const [min, max] = Array.isArray(yDomain) && yDomain.length === 2 ? yDomain : [0, 1];
  const safeFactor = Number(factor) || 1;
  if (safeFactor === 1) return [min, max];
  return [min / safeFactor, max / safeFactor];
}

/**
 * Manual Y-axis zoom for the RCCP capacity/load chart: long-press the axis, then drag up/down
 * to zoom in/out. Double-click (or double-tap) resets to auto-fit. Session-only — the factor
 * lives in component state and resets on reload, it is never persisted.
 *
 * @param {[number, number]} autoYDomain auto-fit domain computed from the chart data
 * @returns {{
 *   yDomain: [number, number], isDragging: boolean, isScaled: boolean, zoomPercent: number,
 *   dragHandlers: object, resetToAuto: Function,
 * }}
 */
export function useRccpChartYScale(autoYDomain) {
  const [factor, setFactor] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const clearLongPressTimer = useCallback(() => {
    if (dragRef.current?.longPressTimer) clearTimeout(dragRef.current.longPressTimer);
  }, []);

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const pointerId = event.pointerId;
    const startY = event.clientY;
    const target = event.currentTarget;
    const drag = {
      pointerId, startY, lastY: startY, startFactor: factor, armed: false, longPressTimer: null,
    };
    dragRef.current = drag;
    drag.longPressTimer = setTimeout(() => {
      if (dragRef.current !== drag) return;
      drag.armed = true;
      // Re-baseline to the last known position: a real hold always jitters a few px, this
      // keeps that pre-arm wobble from being read as an instant zoom jump once armed.
      drag.startY = drag.lastY;
      setIsDragging(true);
      target?.setPointerCapture?.(pointerId);
    }, RCCP_Y_SCALE_LONG_PRESS_MS);
  }, [factor]);

  const onPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.lastY = event.clientY;
    // Movement before the long-press arms is expected (a real hold never sits perfectly still)
    // and must NOT cancel the gesture — only an early pointer-up (see endDrag) does that.
    if (!drag.armed) return;
    setFactor(computeRccpYScaleFactor(drag.startFactor, event.clientY - drag.startY));
  }, []);

  const endDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (drag && event && drag.pointerId !== event.pointerId) return;
    clearLongPressTimer();
    dragRef.current = null;
    setIsDragging(false);
  }, [clearLongPressTimer]);

  const resetToAuto = useCallback(() => {
    setFactor(1);
  }, []);

  const yDomain = useMemo(() => scaleRccpYDomain(autoYDomain, factor), [autoYDomain, factor]);

  const dragHandlers = useMemo(() => ({
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onDoubleClick: resetToAuto,
  }), [onPointerDown, onPointerMove, endDrag, resetToAuto]);

  return {
    yDomain,
    isDragging,
    isScaled: factor !== 1,
    zoomPercent: Math.round(factor * 100),
    dragHandlers,
    resetToAuto,
  };
}
