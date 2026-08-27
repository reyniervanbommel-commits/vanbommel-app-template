import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { currentIsoWindow } from '../components/rccp/rccpUtils';

const RCCP_BOARD_KEY = 'rccp';

/**
 * Persistente RCCP board-settings (board-key `rccp`): ISO-weekrange, vendor,
 * KPI-window en grafiek-toggles. De server vervangt de settings-blob (geen merge) —
 * elk veld moet dus altijd meegestuurd worden.
 *
 * @returns {{ isoWindow, setIsoWindow, lastVendor, setLastVendor, kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys, loaded }}
 */
export function useRccpWindow() {
  const [isoWindow, setIsoWindowState] = useState(() => currentIsoWindow(8));
  const [lastVendor, setLastVendorState] = useState('');
  const [kpiWindowOnly, setKpiWindowOnlyState] = useState(true);
  const [chartVisibleKeys, setChartVisibleKeysState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Actuele waarden in refs zodat een debounced PATCH altijd beide velden meestuurt.
  const isoWindowRef = useRef(isoWindow);
  const lastVendorRef = useRef(lastVendor);
  const kpiWindowOnlyRef = useRef(kpiWindowOnly);
  const chartVisibleKeysRef = useRef(chartVisibleKeys);
  useEffect(() => { isoWindowRef.current = isoWindow; }, [isoWindow]);
  useEffect(() => { lastVendorRef.current = lastVendor; }, [lastVendor]);
  useEffect(() => { kpiWindowOnlyRef.current = kpiWindowOnly; }, [kpiWindowOnly]);
  useEffect(() => { chartVisibleKeysRef.current = chartVisibleKeys; }, [chartVisibleKeys]);

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
        if (typeof data?.settings?.kpiWindowOnly === 'boolean') {
          setKpiWindowOnlyState(data.settings.kpiWindowOnly);
        }
        const storedKeys = data?.settings?.chartVisibleKeys;
        if (storedKeys && typeof storedKeys === 'object' && !Array.isArray(storedKeys)) {
          setChartVisibleKeysState(storedKeys);
        }
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
            kpiWindowOnly: kpiWindowOnlyRef.current,
            chartVisibleKeys: chartVisibleKeysRef.current,
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

  const setKpiWindowOnly = useCallback((value) => {
    const next = Boolean(value);
    setKpiWindowOnlyState((prev) => {
      if (prev === next) return prev;
      kpiWindowOnlyRef.current = next;
      schedulePersist();
      return next;
    });
  }, [schedulePersist]);

  const setChartVisibleKeys = useCallback((value) => {
    const next = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    setChartVisibleKeysState((prev) => {
      const keys = Object.keys(next);
      const unchanged = keys.length === Object.keys(prev).length
        && keys.every((key) => prev[key] === next[key]);
      if (unchanged) return prev;
      chartVisibleKeysRef.current = next;
      schedulePersist();
      return next;
    });
  }, [schedulePersist]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return useMemo(
    () => ({
      isoWindow, setIsoWindow, lastVendor, setLastVendor,
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys, loaded,
    }),
    [
      isoWindow, setIsoWindow, lastVendor, setLastVendor,
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys, loaded,
    ],
  );
}
