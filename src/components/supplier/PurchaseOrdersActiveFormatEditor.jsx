import React, { memo, useCallback } from 'react';
import { useAppToast } from '../../hooks/useAppToast';
import { useColumnFormatRulesMenuDraft } from '../../hooks/useColumnFormatRulesMenuDraft';
import PurchaseOrderColumnFormatRulesSection from './PurchaseOrderColumnFormatRulesSection';

function PurchaseOrdersActiveFormatEditor({
  item,
  referenceColumns = [],
  onSetColumnFormatRules,
}) {
  const { notifyError } = useAppToast();
  const columnKey = item?.columnKey;
  const onPersist = useCallback(async (ruleSet) => {
    try {
      await onSetColumnFormatRules(columnKey, ruleSet);
    } catch (err) {
      notifyError(err?.message || 'Saving conditional formatting failed.');
    }
  }, [columnKey, notifyError, onSetColumnFormatRules]);
  const formatRulesDraft = useColumnFormatRulesMenuDraft({
    open: true,
    columnFormatRuleSet: item?.ruleSet,
    onPersist,
  });

  return (
    <PurchaseOrderColumnFormatRulesSection
      formatTarget={formatRulesDraft.formatTarget}
      setFormatTarget={formatRulesDraft.setFormatTarget}
      formatRules={formatRulesDraft.formatRules}
      referenceColumns={referenceColumns}
      addFormatRule={formatRulesDraft.addFormatRule}
      updateFormatRule={formatRulesDraft.updateFormatRule}
      removeFormatRule={formatRulesDraft.removeFormatRule}
    />
  );
}

export default memo(PurchaseOrdersActiveFormatEditor);
