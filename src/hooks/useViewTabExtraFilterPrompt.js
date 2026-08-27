import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_TAB_ID, extraFiltersEqual, splitExtraFilters } from '../utils/viewTabs';

/**
 * Detecteert extra-filterwijzigingen op een extra tab en telt prompts.
 */
export function useViewTabExtraFilterPrompt({ activeTabId, boardView, extraTabsRef, viewBaseRef }) {
  const skipFilterPromptRef = useRef(false);
  const lastExtraSigRef = useRef('');
  const [extraFilterPrompt, setExtraFilterPrompt] = useState(0);

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
    setExtraFilterPrompt((count) => count + 1);
  }, [activeTabId, boardView.filterByColumn, extraTabsRef, viewBaseRef]);

  return { extraFilterPrompt, skipFilterPrompt };
}
