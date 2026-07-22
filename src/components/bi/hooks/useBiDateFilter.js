import { useCallback, useMemo, useState } from 'react';
import { currentIsoWindow, isoWeekStartUtc } from '../../rccp/rccpUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generiek week/jaar-datumfilter voor de BI-pagina (zelfde velden als RCCP). Er wordt géén
 * datumkolom gekozen: het filter werkt per chart op de datumkolom die die chart zélf als
 * dimensie gebruikt (zie useChartData). De ingevoerde weken (`isoWindow`) worden pas op de
 * charts toegepast wanneer `applyWindow` wordt aangeroepen (kleine refresh-knop).
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

  const setWindowField = useCallback(
    (field, value) => setIsoWindow((prev) => ({ ...prev, [field]: Number(value) })),
    [],
  );

  // Zet de ingevoerde weken pas nu vast voor de charts.
  const applyWindow = useCallback(() => setAppliedWindow(isoWindow), [isoWindow]);

  // Bij inschakelen meteen de huidige weken toepassen zodat het filter direct werkt.
  const setEnabled = useCallback((value) => {
    setEnabledState(value);
    if (value) setAppliedWindow(isoWindow);
  }, [isoWindow]);

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
