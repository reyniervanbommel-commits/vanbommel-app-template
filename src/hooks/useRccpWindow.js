import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { currentIsoWindow } from '../components/rccp/rccpUtils';

const RCCP_BOARD_KEY = 'rccp';

/**
 * Persistente ISO-weekrange voor RCCP (gedeeld tussen /rccp en PO split-pane).
 * @returns {{ isoWindow, setIsoWindow, loaded }}
 */
export function useRccpWindow() {
  const [isoWindow, setIsoWindowState] = useState(() => currentIsoWindow(8));
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/supplier/board-settings/${RCCP_BOARD_KEY}`)
      .then((data) => {
        if (!active) return;
        const stored = data?.settings?.isoWindow;
        if (stored) {
          setIsoWindowState({
            fromYear: stored.fromYear,
            fromWeek: stored.fromWeek,
            toYear: stored.toYear,
            toWeek: stored.toWeek,
          });
        }
      })
      .catch(() => { /* fallback naar defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const setIsoWindow = useCallback((next) => {
    setIsoWindowState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        apiRequest(`/supplier/board-settings/${RCCP_BOARD_KEY}`, {
          method: 'PATCH',
          body: { settings: { isoWindow: value } },
        }).catch(() => { /* stil falen; lokale state blijft leidend */ });
      }, 400);
      return value;
    });
  }, []);

  return useMemo(
    () => ({ isoWindow, setIsoWindow, loaded }),
    [isoWindow, setIsoWindow, loaded],
  );
}
