import { useCallback } from 'react';

export function useColumnFormatRulesMenuActions({
  canSetColumnFormatRules,
  columnKey,
  formatRulesDraft,
  onSetColumnFormatRules,
  onClose,
}) {
  const handleApplyFormatRules = useCallback(async () => {
    if (!canSetColumnFormatRules) return;
    try {
      await onSetColumnFormatRules(columnKey, formatRulesDraft.buildRuleSet());
      onClose();
    } catch (err) {
      window.alert(err?.message || 'Saving conditional formatting failed.');
    }
  }, [canSetColumnFormatRules, columnKey, formatRulesDraft, onSetColumnFormatRules, onClose]);

  const handleClearFormatRules = useCallback(async () => {
    if (!canSetColumnFormatRules) return;
    try {
      await onSetColumnFormatRules(columnKey, null);
      formatRulesDraft.resetDraft();
      onClose();
    } catch (err) {
      window.alert(err?.message || 'Clearing conditional formatting failed.');
    }
  }, [canSetColumnFormatRules, columnKey, formatRulesDraft, onSetColumnFormatRules, onClose]);

  return { handleApplyFormatRules, handleClearFormatRules };
}
