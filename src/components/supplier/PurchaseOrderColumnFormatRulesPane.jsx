import React from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowCounterclockwiseRegular } from '@fluentui/react-icons';
import PurchaseOrderColumnFormatRulesSection from './PurchaseOrderColumnFormatRulesSection';

export default function PurchaseOrderColumnFormatRulesPane({
  styles,
  formatTarget,
  setFormatTarget,
  formatRules,
  formatReferenceColumns,
  addFormatRule,
  updateFormatRule,
  removeFormatRule,
  handleClearFormatRules,
}) {
  return (
    <>
      <PurchaseOrderColumnFormatRulesSection
        formatTarget={formatTarget}
        setFormatTarget={setFormatTarget}
        formatRules={formatRules}
        referenceColumns={formatReferenceColumns}
        addFormatRule={addFormatRule}
        updateFormatRule={updateFormatRule}
        removeFormatRule={removeFormatRule}
      />
      <div className={styles.actionRow}>
        <Button
          className={styles.subPaneFullWidthButton}
          size="small"
          appearance="subtle"
          icon={<ArrowCounterclockwiseRegular />}
          onClick={handleClearFormatRules}
        >
          Reset to default
        </Button>
      </div>
    </>
  );
}
