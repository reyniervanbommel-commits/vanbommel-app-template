import React, { memo, useCallback, useMemo } from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { exportSingleRowToExcel } from '../../../utils/excelExport';
import EntityConfigTable from './EntityConfigTable';

const useStyles = makeStyles({
  discoverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  discoverHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function buildSections({ tableKey, entities, columns, previewTables }) {
  const headerEntity = (entities || []).find((entity) => entity.id === 'header');
  const lineEntity = (entities || []).find((entity) => entity.id === 'line');
  const tableLabel = headerEntity?.title || 'Entity';
  const headerName = headerEntity?.name || 'source';

  if (tableKey === 'purchase-orders' && lineEntity) {
    return [
      {
        scope: 'header',
        title: 'Purchase Order Header columns',
        entityName: headerName,
        columns: columns.header,
        preview: previewTables?.header,
        exportSheetName: 'PurchaseOrderHeaders',
        exportFileName: 'purchase-order-headers-example.xlsx',
        relationHint: 'Yellow-highlighted rows mark the join keys between Purchase Order Headers and Purchase Order Lines.',
      },
      {
        scope: 'line',
        title: 'Purchase Order Line columns',
        entityName: lineEntity.name || 'PurchaseOrderLinesV2',
        columns: columns.line,
        preview: previewTables?.line,
        exportSheetName: 'PurchaseOrderLines',
        exportFileName: 'purchase-order-lines-example.xlsx',
        relationHint: '',
      },
    ];
  }

  return [
    {
      scope: 'header',
      title: `${tableLabel} columns`,
      entityName: headerName,
      columns: columns.header,
      preview: previewTables?.header,
      exportSheetName: tableLabel.replace(/\s+/g, '').slice(0, 31) || 'Entity',
      exportFileName: `${tableKey || 'entity'}-example.xlsx`,
      relationHint: '',
    },
  ];
}

function DataPreviewTables({
  tableKey = 'purchase-orders',
  entities = [],
  previewTables,
  columns = { header: [], line: [] },
  relation,
  togglingKey,
  onToggleVisibility,
  onToggleVisibleAtDelete,
  onToggleWriteback,
  onToggleRccpMeasure,
  onDeleteColumn,
  onSetColumnToggleState,
  onDiscoverFields,
}) {
  const styles = useStyles();
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
  const sections = useMemo(
    () => buildSections({ tableKey, entities, columns, previewTables }),
    [tableKey, entities, columns, previewTables],
  );

  return (
    <>
      {typeof onDiscoverFields === 'function' ? (
        <div className={styles.discoverRow}>
          <Button
            appearance="secondary"
            icon={<SearchRegular />}
            onClick={onDiscoverFields}
            disabled={togglingKey === 'discover-fields'}
          >
            Discover D365 fields
          </Button>
          <Text className={styles.discoverHint}>
            Fetches all available fields from the D365 entity and adds missing columns (hidden by default).
          </Text>
        </div>
      ) : null}
      {sections.map((section) => (
        <EntityConfigTable
          key={section.scope}
          title={section.title}
          entityName={section.entityName}
          columns={section.columns || []}
          preview={section.preview}
          exportSheetName={section.exportSheetName}
          exportFileName={section.exportFileName}
          relationFields={section.scope === 'header' ? relationFields : new Set()}
          relationHint={section.relationHint}
          togglingKey={togglingKey}
          onToggleVisibility={onToggleVisibility}
          onToggleVisibleAtDelete={onToggleVisibleAtDelete}
          onToggleWriteback={onToggleWriteback}
          onToggleRccpMeasure={onToggleRccpMeasure}
          onDeleteColumn={onDeleteColumn}
          onExportExcel={handleExportExcel}
          onSetColumnToggleState={onSetColumnToggleState}
        />
      ))}
    </>
  );
}

export default memo(DataPreviewTables);

