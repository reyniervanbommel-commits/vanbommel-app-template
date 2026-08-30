import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../utils/api';
import {
  KPI_CARDS_BOARD_KEY,
  defaultKpiCardStyle,
  normalizeKpiCardStyles,
} from '../../utils/kpiCardStyles';

const SAVE_DELAY_MS = 400;

const KpiCardStyleContext = createContext(null);

let memoryStyles = null;
let inflight = null;
const listeners = new Set();

function publish(next) {
  memoryStyles = next;
  listeners.forEach((listener) => listener(next));
}

function loadStyles() {
  if (memoryStyles) return Promise.resolve(memoryStyles);
  if (inflight) return inflight;
  inflight = apiRequest(`/supplier/board-settings/${KPI_CARDS_BOARD_KEY}`)
    .then((data) => {
      const next = normalizeKpiCardStyles(data?.settings?.kpiCardStyles);
      memoryStyles = next;
      return next;
    })
    .catch(() => {
      const next = normalizeKpiCardStyles(null);
      memoryStyles = next;
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Loads/saves per-user KPI card colors once (shared PO-board + RCCP).
 * @returns {{ styles: object, updateStyle: function }}
 */
export function useKpiCardStyles() {
  const [styles, setStyles] = useState(() => memoryStyles || normalizeKpiCardStyles(null));
  const latestRef = useRef(styles);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = () => listeners.delete(onPublish);
    function onPublish(next) {
      if (active) setStyles(next);
    }
    listeners.add(onPublish);
    loadStyles().then((next) => {
      if (active) setStyles(next);
    });
    return () => {
      active = false;
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const persist = useCallback((next) => {
    latestRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      apiRequest(`/supplier/board-settings/${KPI_CARDS_BOARD_KEY}`, {
        method: 'PATCH',
        body: { settings: { kpiCardStyles: latestRef.current } },
      }).catch(() => {});
    }, SAVE_DELAY_MS);
  }, []);

  const updateStyle = useCallback((kpiKey, patch) => {
    setStyles((prev) => {
      const next = normalizeKpiCardStyles({
        ...prev,
        [kpiKey]: { ...prev[kpiKey], ...patch },
      });
      publish(next);
      persist(next);
      return next;
    });
  }, [persist]);

  return useMemo(() => ({ styles, updateStyle }), [styles, updateStyle]);
}

export function useKpiCardStyle(kpiKey) {
  const ctx = useContext(KpiCardStyleContext);
  const style = ctx?.styles?.[kpiKey] || defaultKpiCardStyle();
  const updateStyle = useCallback((patch) => {
    ctx?.updateStyle?.(kpiKey, patch);
  }, [ctx, kpiKey]);
  return { style, updateStyle };
}

export { KpiCardStyleContext };
