import { useCallback, useEffect, useRef } from 'react';
import { ALL_TAB_ID, extraFiltersEqual, splitExtraFilters } from '../utils/viewTabs';

/**
 * Houdt extra filters van de actieve tab in tab-state, zonder een prompt te tonen.
 */
export function useViewTabExtraFilterPrompt({
  activeTabId,
  boardView,
  extraTabsRef,
  viewBaseRef,
  onExtraChange,
}) {
  const skipFilterPromptRef = useRef(false);
  const lastExtraSigRef = useRef('');

  const skipFilterPrompt = useCallback(() => {
    skipFilterPromptRef.current = true;
  }, []);

  useEffect(() => {
    if (activeTabId === ALL_TAB_ID) {
      lastExtraSigRef.current = '';
      skipFilterPromptRef.current = false;
      return;
    }
    const liveFilters = boardView.filterByColumn
      || boardView.exportFilterSortGrouping()?.filterByColumn
      || {};
    const extra = splitExtraFilters(liveFilters, viewBaseRef.current);
    const sig = JSON.stringify(extra);
    if (skipFilterPromptRef.current) {
      skipFilterPromptRef.current = false;
      lastExtraSigRef.current = sig;
      return;
    }
    if (sig === lastExtraSigRef.current) return;
    lastExtraSigRef.current = sig;
    const tab = extraTabsRef.current.find((entry) => entry.id === activeTabId);
    if (tab && extraFiltersEqual(extra, tab.extraFilters)) return;
    onExtraChange?.();
  }, [activeTabId, boardView.filterByColumn, extraTabsRef, onExtraChange, viewBaseRef]);

  return { skipFilterPrompt };
}
