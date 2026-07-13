import React from 'react';
import PurchaseOrderFormulaColumnDialog from './PurchaseOrderFormulaColumnDialog';
import PurchaseOrderImageColumnDialog from './PurchaseOrderImageColumnDialog';
import PurchaseOrderBulkEditDialog from './PurchaseOrderBulkEditDialog';

export default function PurchaseOrdersPageDialogs({ formula, image, bulkEdit }) {
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
      <PurchaseOrderImageColumnDialog
        open={image.state.open}
        onOpenChange={(open) => !open && image.close()}
        onSubmit={image.submit}
        sourceColumn={image.state.sourceColumn}
        availableColumns={image.availableColumns}
        initialValue={image.state.editingColumn}
        sampleRowValues={image.sampleRowValues}
      />
      <PurchaseOrderBulkEditDialog {...bulkEdit.dialogState} {...bulkEdit.dialogActions} />
    </>
  );
}
