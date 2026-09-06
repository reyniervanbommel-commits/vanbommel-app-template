import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { currentIsoWindow, isPersistableRccpIsoWindow } from '../components/rccp/rccpUtils';
import {
  parseRccpPlanningDateModes,
  primaryRccpPlanningDateMode,
  rccpPlanningDateModeList,
} from '../components/rccp/rccpPeriodGrain';
import {
  getRccpWindowSnapshot,
  publishRccpWindowState,
  subscribeRccpWindowState,
} from './rccpWindowSync';

const RCCP_BOARD_KEY = 'rccp';

/**
 * Persistente RCCP board-settings (board-key `rccp`): ISO-weekrange (Period, tot 52 weken),
 * vendor, KPI-window en grafiek-toggles. Keep-alive pagina's delen dezelfde sessie-state
 * via rccpWindowSync, zodat de PO-tabel de Period van /rccp overneemt.
 *
 * @returns {{ isoWindow, setIsoWindow, lastVendor, setLastVendor, kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys, planningDateModes, setPlanningDateModes, loaded }}
 */
export function useRccpWindow() {
  const seeded = getRccpWindowSnapshot();
  const [isoWindow, setIsoWindowState] = useState(() => seeded?.isoWindow || currentIsoWindow(8));
  const [lastVendor, setLastVendorState] = useState(() => seeded?.lastVendor || '');
  const [kpiWindowOnly, setKpiWindowOnlyState] = useState(() => (
    typeof seeded?.kpiWindowOnly === 'boolean' ? seeded.kpiWindowOnly : true
  ));
  const [chartVisibleKeys, setChartVisibleKeysState] = useState(() => seeded?.chartVisibleKeys || {});
  const [planningDateModes, setPlanningDateModesState] = useState(() => (
    parseRccpPlanningDateModes(seeded?.planningDateModes || seeded?.planningDateMode)
  ));
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const applyingPeerRef = useRef(false);

  const isoWindowRef = useRef(isoWindow);
  const persistableWindowRef = useRef(
    seeded?.persistableWindow
    || (seeded?.isoWindow && isPersistableRccpIsoWindow(seeded.isoWindow)
      ? seeded.isoWindow
      : currentIsoWindow(8)),
  );
  const isoWindowTouchedRef = useRef(Boolean(seeded?.isoWindow));
  const lastVendorRef = useRef(lastVendor);
  const kpiWindowOnlyRef = useRef(kpiWindowOnly);
  const chartVisibleKeysRef = useRef(chartVisibleKeys);
  const planningDateModesRef = useRef(planningDateModes);
  useEffect(() => { isoWindowRef.current = isoWindow; }, [isoWindow]);
  useEffect(() => { lastVendorRef.current = lastVendor; }, [lastVendor]);
  useEffect(() => { kpiWindowOnlyRef.current = kpiWindowOnly; }, [kpiWindowOnly]);
  useEffect(() => { chartVisibleKeysRef.current = chartVisibleKeys; }, [chartVisibleKeys]);
  useEffect(() => { planningDateModesRef.current = planningDateModes; }, [planningDateModes]);

  const publishSnapshot = useCallback(() => {
    if (applyingPeerRef.current) return;
    publishRccpWindowState({
      isoWindow: isoWindowRef.current,
      persistableWindow: persistableWindowRef.current,
      lastVendor: lastVendorRef.current,
      kpiWindowOnly: kpiWindowOnlyRef.current,
      chartVisibleKeys: chartVisibleKeysRef.current,
      planningDateModes: planningDateModesRef.current,
    });
  }, []);

  const schedulePersist = useCallback(() => {
    if (applyingPeerRef.current) return;
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
            // planningDateMode blijft meegaan zodat een oudere client de primaire load-date leest.
            planningDateMode: primaryRccpPlanningDateMode(planningDateModesRef.current),
            planningDateModes: rccpPlanningDateModeList(planningDateModesRef.current),
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
        if (typeof vendor === 'string' && vendor && !lastVendorRef.current) {
          setLastVendorState(vendor);
          lastVendorRef.current = vendor;
        }
        if (typeof data?.settings?.kpiWindowOnly === 'boolean' && !isoWindowTouchedRef.current) {
          setKpiWindowOnlyState(data.settings.kpiWindowOnly);
          kpiWindowOnlyRef.current = data.settings.kpiWindowOnly;
        }
        const storedKeys = data?.settings?.chartVisibleKeys;
        if (storedKeys && typeof storedKeys === 'object' && !Array.isArray(storedKeys)
          && !isoWindowTouchedRef.current) {
          setChartVisibleKeysState(storedKeys);
          chartVisibleKeysRef.current = storedKeys;
        }
        const storedModes = data?.settings?.planningDateModes || data?.settings?.planningDateMode;
        if (storedModes && !isoWindowTouchedRef.current) {
          const modes = parseRccpPlanningDateModes(storedModes);
          setPlanningDateModesState(modes);
          planningDateModesRef.current = modes;
        }
        publishSnapshot();
      })
      .catch(() => { /* fallback naar defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [schedulePersist, publishSnapshot]);

  useEffect(() => subscribeRccpWindowState((next) => {
    if (!next?.isoWindow) return;
    applyingPeerRef.current = true;
    isoWindowTouchedRef.current = true;
    setIsoWindowState(next.isoWindow);
    isoWindowRef.current = next.isoWindow;
    if (next.persistableWindow) persistableWindowRef.current = next.persistableWindow;
    if (typeof next.lastVendor === 'string') {
      setLastVendorState(next.lastVendor);
      lastVendorRef.current = next.lastVendor;
    }
    if (typeof next.kpiWindowOnly === 'boolean') {
      setKpiWindowOnlyState(next.kpiWindowOnly);
      kpiWindowOnlyRef.current = next.kpiWindowOnly;
    }
    if (next.chartVisibleKeys && typeof next.chartVisibleKeys === 'object') {
      setChartVisibleKeysState(next.chartVisibleKeys);
      chartVisibleKeysRef.current = next.chartVisibleKeys;
    }
    if (next.planningDateModes || next.planningDateMode) {
      const modes = parseRccpPlanningDateModes(next.planningDateModes || next.planningDateMode);
      setPlanningDateModesState(modes);
      planningDateModesRef.current = modes;
    }
    applyingPeerRef.current = false;
  }), []);

  const setIsoWindow = useCallback((next, options = {}) => {
    const persist = options.persist !== false;
    isoWindowTouchedRef.current = true;
    setIsoWindowState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      isoWindowRef.current = value;
      if (persist && isPersistableRccpIsoWindow(value)) persistableWindowRef.current = value;
      if (persist) schedulePersist();
      publishSnapshot();
      return value;
    });
  }, [schedulePersist, publishSnapshot]);

  const setLastVendor = useCallback((account) => {
    const value = typeof account === 'string' ? account : '';
    setLastVendorState((prev) => {
      if (prev === value) return prev;
      lastVendorRef.current = value;
      schedulePersist();
      publishSnapshot();
      return value;
    });
  }, [schedulePersist, publishSnapshot]);

  const setKpiWindowOnly = useCallback((value) => {
    const next = Boolean(value);
    setKpiWindowOnlyState((prev) => {
      if (prev === next) return prev;
      kpiWindowOnlyRef.current = next;
      schedulePersist();
      publishSnapshot();
      return next;
    });
  }, [schedulePersist, publishSnapshot]);

  const setChartVisibleKeys = useCallback((value) => {
    const next = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    setChartVisibleKeysState((prev) => {
      const keys = Object.keys(next);
      const unchanged = keys.length === Object.keys(prev).length
        && keys.every((key) => prev[key] === next[key]);
      if (unchanged) return prev;
      chartVisibleKeysRef.current = next;
      schedulePersist();
      publishSnapshot();
      return next;
    });
  }, [schedulePersist, publishSnapshot]);

  const setPlanningDateModes = useCallback((value) => {
    const next = parseRccpPlanningDateModes(value);
    setPlanningDateModesState((prev) => {
      if (prev.requested === next.requested && prev.confirmed === next.confirmed) return prev;
      planningDateModesRef.current = next;
      schedulePersist();
      publishSnapshot();
      return next;
    });
  }, [schedulePersist, publishSnapshot]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return useMemo(
    () => ({
      isoWindow, setIsoWindow, lastVendor, setLastVendor,
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
      planningDateModes, setPlanningDateModes, loaded,
    }),
    [
      isoWindow, setIsoWindow, lastVendor, setLastVendor,
      kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
      planningDateModes, setPlanningDateModes, loaded,
    ],
  );
}
