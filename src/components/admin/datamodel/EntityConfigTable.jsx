import React, { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Button,
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
import {
  BULK_TOGGLE_CONFIG,
  DATA_TYPE_LABELS,
  createSampleByField,
  getExampleRowValues,
  matchesText,
  toExcelCellValue,
} from './entityConfigTableUtils';

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
  exportButton: { marginLeft: 'auto' },
  headerBulkCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    ...shorthands.gap('4px'),
  },
  headerBulkButtons: { display: 'flex', ...shorthands.gap('4px') },
  headerBulkButton: { minWidth: 'auto' },
});

// Kolomkop met een "alles aan / alles uit"-bulkschakelaar voor de bijbehorende toggle-kolom.
// De knoppen werken op de op dat moment gefilterde kolommen (net als de rij-toggles).
function BulkToggleHeaderCell({ label, action, className }) {
  const styles = useStyles();
  return (
    <TableHeaderCell className={className}>
      <div className={styles.headerBulkCell}>
        <span>{label}</span>
        {action ? (
          <div className={styles.headerBulkButtons} title={`${action.affectedCount} columns affected`}>
            <Button
              size="small"
              appearance="subtle"
              className={styles.headerBulkButton}
              disabled={action.disableEnable}
              onClick={action.onEnable}
            >
              All on
            </Button>
            <Button
              size="small"
              appearance="subtle"
              className={styles.headerBulkButton}
              disabled={action.disableDisable}
              onClick={action.onDisable}
            >
              All off
            </Button>
          </div>
        ) : null}
      </div>
    </TableHeaderCell>
  );
}

export default function EntityConfigTable({
  title,
  entityName,
  columns,
  preview,
  exportSheetName,
  exportFileName,
  relationFields,
  togglingKey,
  onToggleVisibility,
  onToggleVisibleAtDelete,
  onToggleWriteback,
  onDeleteColumn,
  onExportExcel,
  onSetColumnToggleState,
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
  const exportColumnNames = useMemo(
    () => columns.map((column) => column.label || column.d365Field),
    [columns],
  );
  const exportD365Fields = useMemo(
    () => columns.map((column) => column.d365Field),
    [columns],
  );
  const handleExport = useCallback(() => {
    const previewRows = preview?.rows || [];
    const exampleRow = getExampleRowValues(previewRows, exportD365Fields);
    const rowValues = exportD365Fields.map((field) => toExcelCellValue(exampleRow[field]));
    onExportExcel({
      sheetName: exportSheetName,
      fileName: exportFileName,
      columnNames: exportColumnNames,
      rowValues,
    });
  }, [preview, exportD365Fields, exportColumnNames, onExportExcel, exportSheetName, exportFileName]);
  const hasRunningToggle = Boolean(togglingKey);
  const bulkToggleActions = useMemo(() => BULK_TOGGLE_CONFIG.map((config) => {
    const eligibleColumns = filteredColumns.filter(config.isEligible);
    const hasEligibleColumns = eligibleColumns.length > 0;
    const everyEligibleEnabled = hasEligibleColumns && eligibleColumns.every(config.isEnabled);
    const everyEligibleDisabled = hasEligibleColumns && eligibleColumns.every((column) => !config.isEnabled(column));
    return {
      ...config,
      affectedCount: eligibleColumns.length,
      onEnable: () => onSetColumnToggleState({
        columns: filteredColumns,
        toggleType: config.key,
        enabled: true,
      }),
      onDisable: () => onSetColumnToggleState({
        columns: filteredColumns,
        toggleType: config.key,
        enabled: false,
      }),
      disableEnable: hasRunningToggle || !hasEligibleColumns || everyEligibleEnabled,
      disableDisable: hasRunningToggle || !hasEligibleColumns || everyEligibleDisabled,
    };
  }), [filteredColumns, hasRunningToggle, onSetColumnToggleState]);
  // Lookup per toggle-kolom, zodat de bulkschakelaar in de juiste kolomkop komt.
  const bulkActionByKey = useMemo(() => {
    const map = {};
    for (const action of bulkToggleActions) map[action.key] = action;
    return map;
  }, [bulkToggleActions]);

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <Text weight="semibold">{title}</Text>
        <span className={styles.mono}>{entityName}</span>
        <Badge appearance="tint" color="brand" size="small">{visibleCount}/{columns.length} visible</Badge>
        <Button className={styles.exportButton} appearance="secondary" onClick={handleExport}>
          Export Excel
        </Button>
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
      <Text className={styles.muted}>
        Bulk toggle (in the column headers) applies only to the currently filtered columns.
      </Text>
      <div className={styles.tableWrap}>
        <Table size="small" className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.headerCell}>Relation key</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Column</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>D365 field</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Type</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Sample value</TableHeaderCell>
              <BulkToggleHeaderCell
                label="Visible in table"
                action={bulkActionByKey.visibility}
                className={styles.headerCell}
              />
              <BulkToggleHeaderCell
                label="Visible at delete"
                action={bulkActionByKey.visibleAtDelete}
                className={styles.headerCell}
              />
              <BulkToggleHeaderCell
                label="Write-back to D365"
                action={bulkActionByKey.writeback}
                className={styles.headerCell}
              />
              <TableHeaderCell className={styles.headerCell}>Delete custom column</TableHeaderCell>
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
                  onToggleVisibleAtDelete={onToggleVisibleAtDelete}
                  onToggleWriteback={onToggleWriteback}
                  onDeleteColumn={onDeleteColumn}
                />
              );
            })}
            {!filteredColumns.length ? (
              <TableRow>
                <TableCell className={styles.valueCell} colSpan={9}>No columns match the active filter</TableCell>
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
