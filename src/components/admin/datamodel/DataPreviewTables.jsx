import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import DataPreviewColumnConfigRow from './DataPreviewColumnConfigRow';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    width: '100%',
  },
  titleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tableWrap: {
    width: '100%',
    maxHeight: '430px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  table: { minWidth: '1220px' },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    ...shorthands.padding('8px', '12px'),
  },
  valueCell: {
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '240px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...shorthands.padding('6px', '12px'),
  },
  filterInput: { maxWidth: '420px' },
});

const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes/no',
  select: 'Choice list',
};

function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function matchesText(value, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(value || '').toLowerCase().includes(q);
}

function createSampleByField(preview) {
  const previewColumns = preview?.columns || [];
  const previewRows = preview?.rows || [];
  return previewColumns.reduce((lookup, field) => {
    let bestValue = '—';
    for (let i = 0; i < previewRows.length; i += 1) {
      const candidate = previewRows[i]?.values?.[field];
      if (candidate !== null && candidate !== undefined && candidate !== '') {
        bestValue = display(candidate);
        break;
      }
    }
    return { ...lookup, [field]: bestValue };
  }, {});
}

function EntityConfigTable({
  title,
  entityName,
  columns,
  preview,
  relationFields,
  togglingKey,
  onToggleVisibility,
  onToggleWriteback,
}) {
  const styles = useStyles();
  const visibleCount = columns.filter((item) => item.isActive).length;
  const sampledRows = preview?.sampledRows || 0;
  const sampleByField = useMemo(() => createSampleByField(preview), [preview]);
  const [columnFilter, setColumnFilter] = useState('');
  const handleColumnFilter = useCallback((_, data) => setColumnFilter(data.value), []);
  const filteredColumns = useMemo(() => columns.filter((column) => {
    const sampleValue = sampleByField[column.d365Field] || sampleByField[column.label] || '—';
    return matchesText(column.label, columnFilter)
      || matchesText(column.d365Field, columnFilter)
      || matchesText(DATA_TYPE_LABELS[column.dataType] || column.dataType, columnFilter)
      || matchesText(sampleValue, columnFilter);
  }), [columns, sampleByField, columnFilter]);

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <Text weight="semibold">{title}</Text>
        <span className={styles.mono}>{entityName}</span>
        <Badge appearance="tint" color="brand" size="small">{visibleCount}/{columns.length} visible</Badge>
      </div>
      <Text className={styles.muted}>
        Sample values are taken from the latest synced rows ({sampledRows.toLocaleString('nl-NL')} sampled).
      </Text>
      <Input
        className={styles.filterInput}
        value={columnFilter}
        onChange={handleColumnFilter}
        placeholder="Filter columns (name, D365 field, type, sample value)"
      />
      <div className={styles.tableWrap}>
        <Table size="small" className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.headerCell}>Relation key</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Column</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>D365 field</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Type</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Sample value</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Visible in table</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Write-back to D365</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredColumns.map((column) => {
              const fieldKey = String(column.d365Field || '').toLowerCase();
              const isRelationField = relationFields.has(fieldKey);
              const sampleValue = sampleByField[column.d365Field] || sampleByField[column.label] || '—';
              return (
                <DataPreviewColumnConfigRow
                  key={column.id}
                  column={column}
                  typeLabel={DATA_TYPE_LABELS[column.dataType] || column.dataType}
                  sampleValue={sampleValue}
                  isRelationField={isRelationField}
                  togglingKey={togglingKey}
                  onToggleVisibility={onToggleVisibility}
                  onToggleWriteback={onToggleWriteback}
                />
              );
            })}
            {!filteredColumns.length ? (
              <TableRow>
                <TableCell className={styles.valueCell} colSpan={7}>No columns match the active filter</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <Text className={styles.muted}>
        Yellow-highlighted rows mark the 2 fields that join Purchase Order Headers and Purchase Order Lines.
      </Text>
    </div>
  );
}

function DataPreviewTables({
  previewTables,
  columns,
  relation,
  togglingKey,
  onToggleVisibility,
  onToggleWriteback,
}) {
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
        relationFields={relationFields}
        togglingKey={togglingKey}
        onToggleVisibility={onToggleVisibility}
        onToggleWriteback={onToggleWriteback}
      />
      <EntityConfigTable
        title="Purchase Order Line columns"
        entityName="PurchaseOrderLinesV2"
        columns={columns.line}
        preview={previewTables?.line}
        relationFields={relationFields}
        togglingKey={togglingKey}
        onToggleVisibility={onToggleVisibility}
        onToggleWriteback={onToggleWriteback}
      />
    </>
  );
}

export default memo(DataPreviewTables);

