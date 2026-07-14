import React from 'react';
import PurchaseOrderFormulaColumnDialog from './PurchaseOrderFormulaColumnDialog';
import PurchaseOrderBulkEditDialog from './PurchaseOrderBulkEditDialog';

export default function PurchaseOrdersPageDialogs({ formula, bulkEdit }) {
  return (
    <>
      <PurchaseOrderFormulaColumnDialog
        open={formula.state.open}
        onOpenChange={(open) => !open && formula.close()}
        onSubmit={formula.submit}
        sourceColumn={formula.state.sourceColumn}
        availableColumns={formula.availableColumns}
        initialValue={formula.state.editingColumn}
        initialFormatRuleSet={formula.state.editingColumn?.key ? formula.formatRules[formula.state.editingColumn.key] : null}
      />
      <PurchaseOrderBulkEditDialog {...bulkEdit.dialogState} {...bulkEdit.dialogActions} />
    </>
  );
}
