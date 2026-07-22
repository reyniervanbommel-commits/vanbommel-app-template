import { useMemo, useState } from 'react';
import { currentIsoWindow, isoWeekStartUtc } from '../../rccp/rccpUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generiek week/jaar-datumfilter voor de BI-pagina (zelfde velden als RCCP). Er wordt géén
 * datumkolom gekozen: het filter werkt per chart op de datumkolom die die chart zélf als
 * dimensie gebruikt (zie useChartData). Zolang het filter uit staat verandert er niets.
 *
 * @returns {{
 *   enabled: boolean,
 *   setEnabled: (value: boolean) => void,
 *   isoWindow: { fromYear: number, fromWeek: number, toYear: number, toWeek: number },
 *   setWindowField: (field: string, value: number) => void,
 *   dateRange: { start: string, end: string } | null,
 * }}
 */
export function useBiDateFilter() {
  const [enabled, setEnabled] = useState(false);
  const [isoWindow, setIsoWindow] = useState(() => currentIsoWindow(8));

  const setWindowField = useMemo(
    () => (field, value) => setIsoWindow((prev) => ({ ...prev, [field]: Number(value) })),
    [],
  );

  const dateRange = useMemo(() => {
    if (!enabled) return null;
    const { fromYear, fromWeek, toYear, toWeek } = isoWindow;
    const start = isoWeekStartUtc(fromYear, fromWeek);
    const endMonday = isoWeekStartUtc(toYear, toWeek);
    // Inclusief tot en met zondag 23:59:59.999 van de laatste week.
    const end = new Date(endMonday.getTime() + 7 * DAY_MS - 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start: start.toISOString(), end: end.toISOString() };
  }, [enabled, isoWindow]);

  return useMemo(
    () => ({ enabled, setEnabled, isoWindow, setWindowField, dateRange }),
    [enabled, setEnabled, isoWindow, setWindowField, dateRange],
  );
}
