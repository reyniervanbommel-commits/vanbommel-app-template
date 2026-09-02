import { useCallback, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { mapTbDetailToBoardLine } from '../utils/purchaseOrdersBoardMapping';
import { clearUnseenChangeFlagsOnLine } from '../utils/clearUnseenChangeFlags';

// Sublijnen zitten niet meer in de board-payload (die zou bij ~2000 orders tientallen MB's
// worden). Deze store houdt de per-order opgehaalde regels vast, los van de orders-state,
// zodat het openklappen van één order de board-pipeline (filter/sort/grouping) niet opnieuw
// laat draaien en alleen de opengeklapte rij hertekent.

const DATA_BASE = '/data/purchase-orders';

export function lineDetailsKey(dataAreaId, orderNumber) {
  return `${dataAreaId}|${orderNumber}`;
}

const EMPTY_ENTRY = { status: 'idle', lines: null, error: '' };

export function usePurchaseOrderLineDetails() {
  const [entries, setEntries] = useState(() => new Map());
  // De ref is de bron van waarheid: een rollback moet de vorige regels synchroon kunnen
  // teruglezen, en dat kan niet met een functionele state-updater (die draait later).
  const entriesRef = useRef(entries);
  // In-flight requests dedupen: twee snelle klikken op dezelfde order = één call.
  const inFlightRef = useRef(new Map());

  const commit = useCallback((next) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const patchEntry = useCallback((key, patch) => {
    const next = new Map(entriesRef.current);
    next.set(key, { ...(entriesRef.current.get(key) || EMPTY_ENTRY), ...patch });
    commit(next);
  }, [commit]);

  const loadLines = useCallback((dataAreaId, orderNumber) => {
    const key = lineDetailsKey(dataAreaId, orderNumber);
    const existing = inFlightRef.current.get(key);
    if (existing) return existing;

    const request = (async () => {
      patchEntry(key, { status: 'loading', error: '' });
      try {
        const path = `${DATA_BASE}/rows/${encodeURIComponent(dataAreaId)}/${encodeURIComponent(orderNumber)}/details`;
        const raw = await apiRequest(path);
        const lines = (Array.isArray(raw?.details) ? raw.details : []).map(mapTbDetailToBoardLine);
        patchEntry(key, { status: 'ready', lines, error: '' });
        return lines;
      } catch (err) {
        patchEntry(key, { status: 'error', lines: null, error: err.message || 'Loading order lines failed' });
        return null;
      } finally {
        inFlightRef.current.delete(key);
      }
    })();

    inFlightRef.current.set(key, request);
    return request;
  }, [patchEntry]);

  // Optimistische celwijziging op een regel; retourneert de vorige regels voor rollback.
  const applyLineValues = useCallback((dataAreaId, orderNumber, lineNumber, updateLine) => {
    const key = lineDetailsKey(dataAreaId, orderNumber);
    const entry = entriesRef.current.get(key);
    if (!entry || !Array.isArray(entry.lines)) return null;
    const next = new Map(entriesRef.current);
    next.set(key, {
      ...entry,
      lines: entry.lines.map((line) => (line.lineNumber === lineNumber ? updateLine(line) : line)),
    });
    commit(next);
    return entry.lines;
  }, [commit]);

  const applyLineValuesBatch = useCallback((dataAreaId, orderNumber, updateLine) => {
    const key = lineDetailsKey(dataAreaId, orderNumber);
    const entry = entriesRef.current.get(key);
    if (!entry || !Array.isArray(entry.lines)) return null;
    const next = new Map(entriesRef.current);
    next.set(key, { ...entry, lines: entry.lines.map(updateLine) });
    commit(next);
    return entry.lines;
  }, [commit]);

  const restoreLines = useCallback((dataAreaId, orderNumber, lines) => {
    if (!Array.isArray(lines)) return;
    patchEntry(lineDetailsKey(dataAreaId, orderNumber), { lines });
  }, [patchEntry]);

  // Na een board-herlaad (refresh, revisie-wissel) zijn de gecachte regels verouderd.
  const resetLines = useCallback(() => {
    inFlightRef.current.clear();
    if (entriesRef.current.size) commit(new Map());
  }, [commit]);

  // Mark as seen: wis highlights op al geladen sublijnen zonder ze opnieuw op te halen.
  // Geeft de vorige Map terug voor rollback bij een mislukte POST.
  const clearUnseenLineFlags = useCallback(() => {
    const previous = entriesRef.current;
    if (!previous.size) return previous;
    const next = new Map();
    for (const [key, entry] of previous) {
      if (!Array.isArray(entry.lines)) {
        next.set(key, entry);
        continue;
      }
      next.set(key, {
        ...entry,
        lines: entry.lines.map(clearUnseenChangeFlagsOnLine),
      });
    }
    commit(next);
    return previous;
  }, [commit]);

  const restoreEntries = useCallback((snapshot) => {
    if (snapshot instanceof Map) commit(snapshot);
  }, [commit]);

  return useMemo(() => ({
    entries,
    loadLines,
    applyLineValues,
    applyLineValuesBatch,
    restoreLines,
    resetLines,
    clearUnseenLineFlags,
    restoreEntries,
  }), [applyLineValues, applyLineValuesBatch, clearUnseenLineFlags, entries, loadLines, resetLines, restoreEntries, restoreLines]);
}
