import { useCallback, useEffect, useState } from 'react';
import {
  buildFormatRulesDraft,
  getFormatRulesDraft,
  serializeFormatRulesDraft,
} from '../components/supplier/purchaseOrderColumnFilterMenuConstants';

/**
 * Draft state for conditional formatting in the column header menu.
 * @param {{ open: boolean, columnFormatRuleSet: object|null, onPersist?: (ruleSet: object|null) => void|Promise<void> }} options
 */
export function useColumnFormatRulesMenuDraft({ open, columnFormatRuleSet, onPersist }) {
  const [formatTarget, setFormatTargetState] = useState('cell');
  const [formatRules, setFormatRules] = useState([]);

  useEffect(() => {
    if (!open) return;
    const draft = getFormatRulesDraft(columnFormatRuleSet);
    setFormatTargetState(draft.target);
    setFormatRules(draft.rules);
  }, [open, columnFormatRuleSet]);

  const persistDraft = useCallback((target, rules) => {
    if (typeof onPersist !== 'function') return;
    void onPersist(serializeFormatRulesDraft(target, rules));
  }, [onPersist]);

  const setFormatTarget = useCallback((target) => {
    setFormatTargetState(target);
    setFormatRules((rules) => {
      persistDraft(target, rules);
      return rules;
    });
  }, [persistDraft]);

  const addFormatRule = useCallback(() => {
    setFormatRules((prev) => {
      const next = [...prev, buildFormatRulesDraft()];
      persistDraft(formatTarget, next);
      return next;
    });
  }, [formatTarget, persistDraft]);

  const removeFormatRule = useCallback((ruleId) => {
    setFormatRules((prev) => {
      const next = prev.filter((rule) => rule.id !== ruleId);
      persistDraft(formatTarget, next);
      return next;
    });
  }, [formatTarget, persistDraft]);

  const updateFormatRule = useCallback((ruleId, patch) => {
    setFormatRules((prev) => {
      const next = prev.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule));
      persistDraft(formatTarget, next);
      return next;
    });
  }, [formatTarget, persistDraft]);

  const buildRuleSet = useCallback(
    () => serializeFormatRulesDraft(formatTarget, formatRules),
    [formatTarget, formatRules]
  );

  const resetDraft = useCallback(() => {
    const draft = getFormatRulesDraft(null);
    setFormatTargetState(draft.target);
    setFormatRules(draft.rules);
  }, []);

  return {
    formatTarget,
    setFormatTarget,
    formatRules,
    addFormatRule,
    removeFormatRule,
    updateFormatRule,
    buildRuleSet,
    resetDraft,
  };
}
