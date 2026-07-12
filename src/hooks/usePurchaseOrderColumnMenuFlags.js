import { useMemo } from 'react';
import { getColumnTypeMeta } from '../components/supplier/purchaseOrderColumnFilterMenuConstants';

export function usePurchaseOrderColumnMenuFlags({
  column,
  isAdmin,
  onToggleWriteback,
  onRenameColumn,
  onRemoveColumn,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  onSetColumnTextStyle,
  onSetColumnFormatRules,
  onAddColumnRightOf,
  canMakeColumnSticky,
  isStickyColumn,
  isStickyActionEnabled,
  onMakeColumnSticky,
  isConnectedType,
}) {
  const canToggleWriteback = Boolean(isAdmin && typeof onToggleWriteback === 'function' && column.d365Field && column.writeBackAllowed !== false);
  const showWritebackLocked = Boolean(column.source === 'd365' && column.d365Field && column.writeBackAllowed === false);
  const canRenameColumn = Boolean(column?.id && typeof onRenameColumn === 'function');
  const canRemoveColumn = Boolean(column.source === 'custom' && typeof onRemoveColumn === 'function');
  const isLineColumn = column.level === 'line';
  const isLineNumberColumn = isLineColumn && column.dataType === 'number';
  const canToggleLineTotal = Boolean(isLineNumberColumn && typeof onToggleLineColumnSum === 'function');
  const canPushLineTotalToHeader = Boolean(isLineNumberColumn && typeof onPushLineTotalToHeader === 'function');
  const canPushLineValuesToHeader = Boolean(isLineColumn && typeof onPushLineValuesToHeader === 'function');
  const canSetColumnTextStyle = typeof onSetColumnTextStyle === 'function';
  const canSetColumnFormatRules = typeof onSetColumnFormatRules === 'function';
  const canPromoteToSticky = Boolean(
    canMakeColumnSticky
    && !isStickyColumn
    && isStickyActionEnabled
    && typeof onMakeColumnSticky === 'function'
  );
  const canUnstickSticky = Boolean(
    canMakeColumnSticky
    && isStickyColumn
    && isStickyActionEnabled
    && typeof onMakeColumnSticky === 'function'
  );
  const canToggleStickyAction = canPromoteToSticky || canUnstickSticky;
  const canAddColumn = typeof onAddColumnRightOf === 'function';
  const canEditFormulaColumn = Boolean(canAddColumn && column.source === 'custom' && String(column.formulaExpr || '').trim());
  const canEditImageColumn = Boolean(canAddColumn && column.source === 'custom' && column.dataType === 'image');
  const isImageColumn = column?.dataType === 'image';
  const columnTypeMeta = useMemo(() => getColumnTypeMeta(column, { isConnected: isConnectedType }), [column, isConnectedType]);

  return {
    canToggleWriteback,
    showWritebackLocked,
    canRenameColumn,
    canRemoveColumn,
    canToggleLineTotal,
    canPushLineTotalToHeader,
    canPushLineValuesToHeader,
    canSetColumnTextStyle,
    canSetColumnFormatRules,
    canPromoteToSticky,
    canUnstickSticky,
    canToggleStickyAction,
    canAddColumn,
    canEditFormulaColumn,
    canEditImageColumn,
    isImageColumn,
    columnTypeMeta,
  };
}
