import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { currentIsoWindow, isoWeekStartUtc } from '../../rccp/rccpUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generiek week/jaar-datumfilter voor de BI-pagina (zelfde velden als RCCP). Er wordt géén
 * datumkolom gekozen: het filter werkt per chart op de datumkolom die die chart zélf als
 * dimensie gebruikt (zie useChartData). De instelling (aan/uit + weken) wordt centraal bewaard
 * via GET/PUT /api/bi/date-filter en geldt daarmee voor iedereen. De ingevoerde weken worden pas
 * toegepast (en bewaard) bij `applyWindow` (kleine refresh-knop) of bij inschakelen.
 *
 * @returns {{
 *   enabled: boolean,
 *   setEnabled: (value: boolean) => void,
 *   isoWindow: { fromYear: number, fromWeek: number, toYear: number, toWeek: number },
 *   setWindowField: (field: string, value: number) => void,
 *   applyWindow: () => void,
 *   dateRange: { start: string, end: string } | null,
 * }}
 */
export function useBiDateFilter() {
  const [enabled, setEnabledState] = useState(false);
  const [isoWindow, setIsoWindow] = useState(() => currentIsoWindow(8));
  const [appliedWindow, setAppliedWindow] = useState(isoWindow);

  // Gedeelde instelling laden bij mount.
  useEffect(() => {
    let active = true;
    apiRequest('/bi/date-filter')
      .then((data) => {
        if (!active || !data?.dateFilter) return;
        const { enabled: on, isoWindow: win } = data.dateFilter;
        setEnabledState(Boolean(on));
        if (win) { setIsoWindow(win); setAppliedWindow(win); }
      })
      .catch(() => { /* val terug op defaults */ });
    return () => { active = false; };
  }, []);

  // Centraal bewaren zodat het voor iedereen geldt.
  const persist = useCallback((next) => {
    apiRequest('/bi/date-filter', { method: 'PUT', body: next })
      .catch(() => { /* stil falen; lokale state blijft leidend */ });
  }, []);

  const setWindowField = useCallback(
    (field, value) => setIsoWindow((prev) => ({ ...prev, [field]: Number(value) })),
    [],
  );

  // Zet de ingevoerde weken vast voor de charts én bewaar ze centraal.
  const applyWindow = useCallback(() => {
    setAppliedWindow(isoWindow);
    persist({ enabled, isoWindow });
  }, [enabled, isoWindow, persist]);

  // Bij inschakelen meteen toepassen; toggle wordt centraal bewaard.
  const setEnabled = useCallback((value) => {
    setEnabledState(value);
    if (value) setAppliedWindow(isoWindow);
    persist({ enabled: value, isoWindow });
  }, [isoWindow, persist]);

  const dateRange = useMemo(() => {
    if (!enabled) return null;
    const { fromYear, fromWeek, toYear, toWeek } = appliedWindow;
    const start = isoWeekStartUtc(fromYear, fromWeek);
    const endMonday = isoWeekStartUtc(toYear, toWeek);
    // Inclusief tot en met zondag 23:59:59.999 van de laatste week.
    const end = new Date(endMonday.getTime() + 7 * DAY_MS - 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start: start.toISOString(), end: end.toISOString() };
  }, [enabled, appliedWindow]);

  return useMemo(
    () => ({ enabled, setEnabled, isoWindow, setWindowField, applyWindow, dateRange }),
    [enabled, setEnabled, isoWindow, setWindowField, applyWindow, dateRange],
  );
}
