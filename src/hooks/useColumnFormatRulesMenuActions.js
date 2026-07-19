import { useCallback } from 'react';

export function useColumnFormatRulesMenuActions({
  canSetColumnFormatRules,
  columnKey,
  formatRulesDraft,
  onSetColumnFormatRules,
  onError,
}) {
  const handleClearFormatRules = useCallback(async () => {
    if (!canSetColumnFormatRules) return;
    try {
      await onSetColumnFormatRules(columnKey, null);
      formatRulesDraft.resetDraft();
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err?.message || 'Clearing conditional formatting failed.');
      }
    }
  }, [canSetColumnFormatRules, columnKey, formatRulesDraft, onError, onSetColumnFormatRules]);

  return { handleClearFormatRules };
}
