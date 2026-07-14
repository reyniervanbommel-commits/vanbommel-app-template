import { createContext, useContext } from 'react';

/**
 * Context met de globale track-changes-meta uit de board-read (meta.trackChanges):
 * { mode, activeOffsetByColumnId, defaultPattern }. null = feature staat globaal uit.
 * Zo hoeven de cel-componenten de meta niet door zes lagen props te ontvangen.
 */
export const TrackChangesContext = createContext(null);

export function useTrackChangesMeta() {
  return useContext(TrackChangesContext);
}
