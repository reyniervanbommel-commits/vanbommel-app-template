import { useEffect, useRef } from 'react';
import { makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  flash: {
    animationDuration: '180ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
    animationName: {
      from: { opacity: 0.45 },
      to: { opacity: 1 },
    },
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms',
      animationName: 'none',
    },
  },
});

/** Griffel slots are space-separated atomic classes; classList.add/remove reject spaces. */
export function applyClassTokens(node, className, on) {
  const tokens = String(className || '').trim().split(/\s+/).filter(Boolean);
  if (!node || !tokens.length) return;
  if (on) node.classList.add(...tokens);
  else node.classList.remove(...tokens);
}

/**
 * Replays a compositor opacity fade when `signature` changes.
 * No React state — avoids extra renders on the PO-board hot path.
 * @param {string} signature
 */
export function useRccpChartFlash(signature) {
  const styles = useStyles();
  const ref = useRef(null);
  const skipFirst = useRef(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (skipFirst.current) {
      skipFirst.current = false;
      return undefined;
    }
    applyClassTokens(node, styles.flash, false);
    void node.offsetWidth;
    applyClassTokens(node, styles.flash, true);
    const clear = () => applyClassTokens(node, styles.flash, false);
    node.addEventListener('animationend', clear);
    return () => node.removeEventListener('animationend', clear);
  }, [signature, styles.flash]);

  return ref;
}
