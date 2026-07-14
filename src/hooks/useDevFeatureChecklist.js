import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDevChecklistItems, devTestItems } from '../config/devTestItems';
import { APP_VERSION } from '../config/version';

const CHECKLIST_ITEMS = buildDevChecklistItems(devTestItems);
const STORAGE_KEY = `vendorportal.dev-feature-checklist.${APP_VERSION}`;
const VALID_IDS = new Set(CHECKLIST_ITEMS.map((item) => item.id));

const normalizeCheckedIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((id) => typeof id === 'string' && VALID_IDS.has(id));
};

const loadCheckedIds = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeCheckedIds(JSON.parse(raw));
  } catch {
    return [];
  }
};

/**
 * Levert de status en handlers voor de afvinklijst met nieuwe dev-features.
 */
export default function useDevFeatureChecklist() {
  const [checkedIds, setCheckedIds] = useState(loadCheckedIds);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedIds));
  }, [checkedIds]);

  const toggleChecked = useCallback((featureId) => {
    if (!VALID_IDS.has(featureId)) {
      return;
    }

    setCheckedIds((current) => {
      if (current.includes(featureId)) {
        return current.filter((id) => id !== featureId);
      }

      return [...current, featureId];
    });
  }, []);

  const resetChecked = useCallback(() => {
    setCheckedIds([]);
  }, []);

  const completedCount = checkedIds.length;

  return useMemo(
    () => ({
      items: CHECKLIST_ITEMS,
      checkedIds,
      completedCount,
      totalCount: CHECKLIST_ITEMS.length,
      allCompleted: CHECKLIST_ITEMS.length > 0 && completedCount === CHECKLIST_ITEMS.length,
      toggleChecked,
      resetChecked,
    }),
    [checkedIds, completedCount, resetChecked, toggleChecked],
  );
}
