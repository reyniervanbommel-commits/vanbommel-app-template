import { useCallback, useEffect, useState } from 'react';
import {
  buildFormatRulesDraft,
  getFormatRulesDraft,
  serializeFormatRulesDraft,
} from '../components/supplier/purchaseOrderColumnFilterMenuConstants';

/**
 * Draft state for conditional formatting in the column header menu.
 * @param {{ open: boolean, columnFormatRuleSet: object|null }} options
 */
export function useColumnFormatRulesMenuDraft({ open, columnFormatRuleSet }) {
  const [formatTarget, setFormatTarget] = useState('cell');
  const [formatRules, setFormatRules] = useState([]);

  useEffect(() => {
    if (!open) return;
    const draft = getFormatRulesDraft(columnFormatRuleSet);
    setFormatTarget(draft.target);
    setFormatRules(draft.rules);
  }, [open, columnFormatRuleSet]);

  const addFormatRule = useCallback(() => {
    setFormatRules((prev) => [...prev, buildFormatRulesDraft()]);
  }, []);

  const removeFormatRule = useCallback((ruleId) => {
    setFormatRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  }, []);

  const updateFormatRule = useCallback((ruleId, patch) => {
    setFormatRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)));
  }, []);

  const buildRuleSet = useCallback(
    () => serializeFormatRulesDraft(formatTarget, formatRules),
    [formatTarget, formatRules]
  );

  const resetDraft = useCallback(() => {
    const draft = getFormatRulesDraft(null);
    setFormatTarget(draft.target);
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
