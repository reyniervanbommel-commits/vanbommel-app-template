import { useCallback, useMemo, useState } from 'react';

export function usePurchaseOrderFormulaDialogState({
  visibleHeaderColumns,
  addHeaderColumnAfter,
  updateFormulaColumn,
  renameColumn,
  headerColumnFormatRules,
  saveHeaderColumnFormatRules,
  setEditingColumnKey,
}) {
  const [formulaDialogState, setFormulaDialogState] = useState({ open: false, sourceColumn: null, editingColumn: null });

  const openFormulaDialog = useCallback((sourceColumn, editingColumn = null) => {
    setFormulaDialogState({ open: true, sourceColumn, editingColumn });
  }, []);

  const closeFormulaDialog = useCallback(() => {
    setFormulaDialogState({ open: false, sourceColumn: null, editingColumn: null });
  }, []);

  const handleFormulaTypeSelection = useCallback((sourceColumn, typeDef) => {
    const typeKey = String(typeDef?.key || '').trim().toLowerCase();
    if (typeKey !== 'formula' && typeKey !== 'formula-edit') return false;
    openFormulaDialog(sourceColumn, typeKey === 'formula-edit' ? sourceColumn : null);
    return true;
  }, [openFormulaDialog]);

  const formulaReferenceColumns = useMemo(
    () => (Array.isArray(visibleHeaderColumns) ? visibleHeaderColumns : [])
      .filter((column) => !String(column?.formulaExpr || '').trim()),
    [visibleHeaderColumns]
  );

  const submitFormulaColumn = useCallback(async ({ label, dataType, formulaExpr, formatRuleSet }) => {
    const editingColumn = formulaDialogState.editingColumn;
    const editingKey = String(editingColumn?.key || '').trim();
    if (formatRuleSet?.target === 'row') {
      const existingRowTarget = Object.entries(headerColumnFormatRules || {}).find(
        ([columnKey, ruleSet]) => ruleSet?.target === 'row' && columnKey !== editingKey
      );
      if (existingRowTarget) {
        throw new Error('Only one column can use row-level conditional formatting.');
      }
    }

    if (editingColumn?.id) {
      await updateFormulaColumn(editingColumn.id, { label, dataType, formulaExpr });
      if (editingKey && formatRuleSet) {
        await saveHeaderColumnFormatRules(editingKey, formatRuleSet);
      }
      setEditingColumnKey(editingKey);
      return;
    }

    const anchorKey = String(formulaDialogState.sourceColumn?.key || '').trim();
    if (!anchorKey) return;
    const created = await addHeaderColumnAfter(anchorKey, { label, dataType, formulaExpr });
    if (!created?.key) return;
    if (formatRuleSet) {
      await saveHeaderColumnFormatRules(created.key, formatRuleSet);
    }
    setEditingColumnKey(created.key);
  }, [
    addHeaderColumnAfter,
    formulaDialogState,
    headerColumnFormatRules,
    saveHeaderColumnFormatRules,
    setEditingColumnKey,
    updateFormulaColumn,
  ]);

  return {
    formulaDialogState,
    openFormulaDialog,
    closeFormulaDialog,
    handleFormulaTypeSelection,
    formulaReferenceColumns,
    submitFormulaColumn,
  };
}
