import { useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 450;

function readReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Of de gebruiker minder beweging wil. Input: geen. Output: boolean.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(readReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function toFinite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Tweent een getal van de vorige naar de nieuwe waarde (niet bij eerste render).
 * @param {number} target
 * @param {{ durationMs?: number }} [options]
 * @returns {number}
 */
export function useAnimatedNumber(target, options = {}) {
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
  const reduced = usePrefersReducedMotion();
  const safeTarget = toFinite(target);
  const [value, setValue] = useState(safeTarget);
  const currentRef = useRef(safeTarget);
  const firstRef = useRef(true);
  const frameRef = useRef(0);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      currentRef.current = safeTarget;
      setValue(safeTarget);
      return undefined;
    }
    if (reduced || currentRef.current === safeTarget) {
      currentRef.current = safeTarget;
      setValue(safeTarget);
      return undefined;
    }

    const from = currentRef.current;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const next = from + (safeTarget - from) * easeOutCubic(progress);
      currentRef.current = next;
      setValue(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      currentRef.current = safeTarget;
      setValue(safeTarget);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [safeTarget, durationMs, reduced]);

  return value;
}

export const ANIMATED_NUMBER_MS = DEFAULT_DURATION_MS;
