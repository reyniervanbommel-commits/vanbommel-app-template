import { useMemo, useState } from 'react';
import { currentIsoWindow, isoWeekStartUtc } from '../../rccp/rccpUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Week/jaar-datumfilter voor de BI-pagina (zelfde UX als RCCP). De gekozen ISO-weekrange wordt
 * vertaald naar een `between`-filter op een datumkolom, die via useChartData/biAggregate op de
 * charts wordt toegepast. Zonder gekozen datumkolom is er geen filter (alle datums).
 *
 * @param {{ key: string, label: string, dataType?: string }[]} columns
 * @returns {{
 *   dateColumns: object[],
 *   dateColumnKey: string,
 *   setDateColumnKey: (key: string) => void,
 *   isoWindow: { fromYear: number, fromWeek: number, toYear: number, toWeek: number },
 *   setWindowField: (field: string, value: number) => void,
 *   externalFilterByColumn: Record<string, object> | undefined,
 * }}
 */
export function useBiDateFilter(columns) {
  const [dateColumnKey, setDateColumnKey] = useState('');
  const [isoWindow, setIsoWindow] = useState(() => currentIsoWindow(8));

  const dateColumns = useMemo(
    () => (columns || []).filter((col) => col.dataType === 'date'),
    [columns],
  );

  const setWindowField = useMemo(
    () => (field, value) => setIsoWindow((prev) => ({ ...prev, [field]: Number(value) })),
    [],
  );

  const externalFilterByColumn = useMemo(() => {
    if (!dateColumnKey) return undefined;
    const { fromYear, fromWeek, toYear, toWeek } = isoWindow;
    const start = isoWeekStartUtc(fromYear, fromWeek);
    const endMonday = isoWeekStartUtc(toYear, toWeek);
    // Inclusief tot en met zondag 23:59:59.999 van de laatste week.
    const end = new Date(endMonday.getTime() + 7 * DAY_MS - 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    return {
      [dateColumnKey]: {
        operator: 'between',
        value: start.toISOString(),
        secondaryValue: end.toISOString(),
      },
    };
  }, [dateColumnKey, isoWindow]);

  return useMemo(
    () => ({ dateColumns, dateColumnKey, setDateColumnKey, isoWindow, setWindowField, externalFilterByColumn }),
    [dateColumns, dateColumnKey, isoWindow, setWindowField, externalFilterByColumn],
  );
}
