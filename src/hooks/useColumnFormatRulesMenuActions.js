import { useCallback } from 'react';

export function useColumnFormatRulesMenuActions({
  canSetColumnFormatRules,
  columnKey,
  formatRulesDraft,
  onSetColumnFormatRules,
  onClose,
  onError,
}) {
  const handleApplyFormatRules = useCallback(async () => {
    if (!canSetColumnFormatRules) return;
    try {
      await onSetColumnFormatRules(columnKey, formatRulesDraft.buildRuleSet());
      onClose();
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err?.message || 'Saving conditional formatting failed.');
      }
    }
  }, [canSetColumnFormatRules, columnKey, formatRulesDraft, onSetColumnFormatRules, onClose, onError]);

  const handleClearFormatRules = useCallback(async () => {
    if (!canSetColumnFormatRules) return;
    try {
      await onSetColumnFormatRules(columnKey, null);
      formatRulesDraft.resetDraft();
      onClose();
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err?.message || 'Clearing conditional formatting failed.');
      }
    }
  }, [canSetColumnFormatRules, columnKey, formatRulesDraft, onSetColumnFormatRules, onClose, onError]);

  return { handleApplyFormatRules, handleClearFormatRules };
}
