import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { currentIsoWindow, isPersistableRccpIsoWindow } from '../components/rccp/rccpUtils';
import {
  RCCP_PLANNING_DATE_REQUESTED,
  parseRccpPlanningDateMode,
} from '../components/rccp/rccpPeriodGrain';

const RCCP_BOARD_KEY = 'rccp';

/**
 * Persistente RCCP board-settings (board-key `rccp`): ISO-weekrange (Period, tot 52 weken),
 * vendor, KPI-window en grafiek-toggles. De server vervangt de settings-blob (geen merge) —
 * elk veld moet dus altijd meegestuurd worden.
 *
 * @returns {{ isoWindow, setIsoWindow, lastVendor, setLastVendor, kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys, planningDateMode, setPlanningDateMode, loaded }}
 */
export function useRccpWindow() {
  const [isoWindow, setIsoWindowState] = useState(() => currentIsoWindow(8));
  const [lastVendor, setLastVendorState] = useState('');
  const [kpiWindowOnly, setKpiWindowOnlyState] = useState(true);
  const [chartVisibleKeys, setChartVisibleKeysState] = useState({});
  const [planningDateMode, setPlanningDateModeState] = useState(RCCP_PLANNING_DATE_REQUESTED);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Actuele waarden in refs zodat een debounced PATCH altijd beide velden meestuurt.
  const isoWindowRef = useRef(isoWindow);
  const persistableWindowRef = useRef(isoWindow);
  const isoWindowTouchedRef = useRef(false);
  const lastVendorRef = useRef(lastVendor);
  const kpiWindowOnlyRef = useRef(kpiWindowOnly);
  const chartVisibleKeysRef = useRef(chartVisibleKeys);
  const planningDateModeRef = useRef(planningDateMode);
  useEffect(() => { isoWindowRef.current = isoWindow; }, [isoWindow]);
  useEffect(() => { lastVendorRef.current = lastVendor; }, [lastVendor]);
  useEffect(() => { kpiWindowOnlyRef.current = kpiWindowOnly; }, [kpiWindowOnly]);
  useEffect(() => { chartVisibleKeysRef.current = chartVisibleKeys; }, [chartVisibleKeys]);
  useEffect(() => { planningDateModeRef.current = planningDateMode; }, [planningDateMode]);

  // Schrijft isoWindow + lastVendorAccount samen weg (debounced), zodat de blob-replace op de
  // server nooit één van beide velden verliest. Show-weeks-with-data blijft tot twee jaar
  // persistable; grotere ranges blijven sessie-only.
  const schedulePersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiRequest(`/supplier/board-settings/${RCCP_BOARD_KEY}`, {
        method: 'PATCH',
        body: {
          settings: {
            isoWindow: persistableWindowRef.current,
            lastVendorAccount: lastVendorRef.current,
            kpiWindowOnly: kpiWindowOnlyRef.current,
            chartVisibleKeys: chartVisibleKeysRef.current,
            planningDateMode: planningDateModeRef.current,
          },
        },
      }).catch(() => { /* stil falen; lokale state blijft leidend */ });
    }, 400);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest(`/supplier/board-settings/${RCCP_BOARD_KEY}`)
      .then((data) => {
        if (!active) return;
        const stored = data?.settings?.isoWindow;
        if (!isoWindowTouchedRef.current && stored && isPersistableRccpIsoWindow(stored)) {
          const compact = {
            fromYear: stored.fromYear,
            fromWeek: stored.fromWeek,
            toYear: stored.toYear,
            toWeek: stored.toWeek,
          };
          setIsoWindowState(compact);
          isoWindowRef.current = compact;
          persistableWindowRef.current = compact;
        } else if (!isoWindowTouchedRef.current && stored) {
          const fallback = currentIsoWindow(8);
          setIsoWindowState(fallback);
          isoWindowRef.current = fallback;
          persistableWindowRef.current = fallback;
          schedulePersist();
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
        if (data?.settings?.planningDateMode) {
          const mode = parseRccpPlanningDateMode(data.settings.planningDateMode);
          setPlanningDateModeState(mode);
          planningDateModeRef.current = mode;
        }
      })
      .catch(() => { /* fallback naar defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [schedulePersist]);

  const setIsoWindow = useCallback((next, options = {}) => {
    const persist = options.persist !== false;
    isoWindowTouchedRef.current = true;
    setIsoWindowState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      isoWindowRef.current = value;
      if (persist && isPersistableRccpIsoWindow(value)) persistableWindowRef.current = value;
      if (persist) schedulePersist();
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

  const setPlanningDateMode = useCallback((value) => {
    const next = parseRccpPlanningDateMode(value);
    setPlanningDateModeState((prev) => {
      if (prev === next) return prev;
      planningDateModeRef.current = next;
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
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
      planningDateMode, setPlanningDateMode, loaded,
    }),
    [
      isoWindow, setIsoWindow, lastVendor, setLastVendor,
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
      planningDateMode, setPlanningDateMode, loaded,
    ],
  );
}
