import React, { memo, useCallback, useMemo } from 'react';
import { exportSingleRowToExcel } from '../../../utils/excelExport';
import EntityConfigTable from './EntityConfigTable';

function DataPreviewTables({
  previewTables,
  columns,
  relation,
  togglingKey,
  onToggleVisibility,
  onToggleVisibleAtDelete,
  onToggleWriteback,
  onDeleteColumn,
  onSetColumnToggleState,
}) {
  const handleExportExcel = useCallback(({ sheetName, fileName, columnNames, rowValues }) => {
    exportSingleRowToExcel({
      sheetName,
      fileName,
      columnNames,
      rowValues,
    });
  }, []);
  const relationFields = useMemo(
    () => new Set((relation?.onFields || []).map((field) => String(field).toLowerCase())),
    [relation],
  );

  return (
    <>
      <EntityConfigTable
        title="Purchase Order Header columns"
        entityName="PurchaseOrderHeadersV2"
        columns={columns.header}
        preview={previewTables?.header}
        exportSheetName="PurchaseOrderHeaders"
        exportFileName="purchase-order-headers-example.xlsx"
        relationFields={relationFields}
        togglingKey={togglingKey}
        onToggleVisibility={onToggleVisibility}
        onToggleVisibleAtDelete={onToggleVisibleAtDelete}
        onToggleWriteback={onToggleWriteback}
        onDeleteColumn={onDeleteColumn}
        onExportExcel={handleExportExcel}
        onSetColumnToggleState={onSetColumnToggleState}
      />
      <EntityConfigTable
        title="Purchase Order Line columns"
        entityName="PurchaseOrderLinesV2"
        columns={columns.line}
        preview={previewTables?.line}
        exportSheetName="PurchaseOrderLines"
        exportFileName="purchase-order-lines-example.xlsx"
        relationFields={relationFields}
        togglingKey={togglingKey}
        onToggleVisibility={onToggleVisibility}
        onToggleVisibleAtDelete={onToggleVisibleAtDelete}
        onToggleWriteback={onToggleWriteback}
        onDeleteColumn={onDeleteColumn}
        onExportExcel={handleExportExcel}
        onSetColumnToggleState={onSetColumnToggleState}
      />
    </>
  );
}

export default memo(DataPreviewTables);

