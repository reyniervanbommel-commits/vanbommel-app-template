import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { currentIsoWindow } from '../components/rccp/rccpUtils';

const RCCP_BOARD_KEY = 'rccp';

/**
 * Persistente RCCP board-settings (board-key `rccp`): de ISO-weekrange EN de laatst gekozen
 * vendor. Beide worden bewust samen beheerd omdat de server de settings-blob vervangt (niet
 * merget) bij een PATCH — los wegschrijven zou het andere veld wissen.
 *
 * @returns {{ isoWindow, setIsoWindow, lastVendor, setLastVendor, loaded }}
 */
export function useRccpWindow() {
  const [isoWindow, setIsoWindowState] = useState(() => currentIsoWindow(8));
  const [lastVendor, setLastVendorState] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Actuele waarden in refs zodat een debounced PATCH altijd beide velden meestuurt.
  const isoWindowRef = useRef(isoWindow);
  const lastVendorRef = useRef(lastVendor);
  useEffect(() => { isoWindowRef.current = isoWindow; }, [isoWindow]);
  useEffect(() => { lastVendorRef.current = lastVendor; }, [lastVendor]);

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
        const vendor = data?.settings?.lastVendorAccount;
        if (typeof vendor === 'string' && vendor) setLastVendorState(vendor);
      })
      .catch(() => { /* fallback naar defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  // Schrijft isoWindow + lastVendorAccount samen weg (debounced), zodat de blob-replace op de
  // server nooit één van beide velden verliest.
  const schedulePersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiRequest(`/supplier/board-settings/${RCCP_BOARD_KEY}`, {
        method: 'PATCH',
        body: {
          settings: {
            isoWindow: isoWindowRef.current,
            lastVendorAccount: lastVendorRef.current,
          },
        },
      }).catch(() => { /* stil falen; lokale state blijft leidend */ });
    }, 400);
  }, []);

  const setIsoWindow = useCallback((next) => {
    setIsoWindowState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      isoWindowRef.current = value;
      schedulePersist();
      return value;
    });
  }, [schedulePersist]);

  const setLastVendor = useCallback((account) => {
    const value = typeof account === 'string' ? account : '';
    setLastVendorState((prev) => {
      if (prev === value) return prev;
      lastVendorRef.current = value;
      schedulePersist();
      return value;
    });
  }, [schedulePersist]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return useMemo(
    () => ({ isoWindow, setIsoWindow, lastVendor, setLastVendor, loaded }),
    [isoWindow, setIsoWindow, lastVendor, setLastVendor, loaded],
  );
}
