import React, { memo, useCallback, useMemo } from 'react';
import {
  Badge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowUploadRegular, LinkRegular, LockClosedRegular } from '@fluentui/react-icons';

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
  hiddenRow: { opacity: 0.55 },
  relationRow: { backgroundColor: 'rgba(255, 179, 0, 0.09)' },
  cellCenter: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px') },
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

function ColumnConfigRow({
  column,
  sampleValue,
  isRelationField,
  togglingKey,
  onToggleVisibility,
  onToggleWriteback,
}) {
  const styles = useStyles();
  const handleVisibility = useCallback(() => onToggleVisibility(column), [onToggleVisibility, column]);
  const handleWriteback = useCallback(() => onToggleWriteback(column), [onToggleWriteback, column]);
  const visibilityBusy = togglingKey === `vis-${column.id}`;
  const writebackBusy = togglingKey === `wb-${column.id}`;
  const rowClassName = isRelationField
    ? `${column.isActive ? '' : styles.hiddenRow} ${styles.relationRow}`.trim()
    : (column.isActive ? undefined : styles.hiddenRow);

  return (
    <TableRow className={rowClassName}>
      <TableCell className={styles.valueCell}>
        {isRelationField ? (
          <Badge appearance="filled" color="warning" icon={<LinkRegular />}>
            Header-Line link key
          </Badge>
        ) : (
          <Text size={200} className={styles.muted}>—</Text>
        )}
      </TableCell>
      <TableCell className={styles.valueCell}>
        <Text weight="semibold">{column.label}</Text>
      </TableCell>
      <TableCell className={styles.valueCell}>
        {column.source === 'd365' ? (
          <span className={styles.mono}>{column.d365Field || '(derived)'}</span>
        ) : (
          <Badge appearance="tint" color="informative" size="small">Custom column</Badge>
        )}
      </TableCell>
      <TableCell className={styles.valueCell}>{DATA_TYPE_LABELS[column.dataType] || column.dataType}</TableCell>
      <TableCell className={styles.valueCell} title={sampleValue}>
        {sampleValue}
      </TableCell>
      <TableCell className={styles.valueCell}>
        {column.hideAllowed ? (
          <Switch
            checked={column.isActive}
            disabled={visibilityBusy}
            onChange={handleVisibility}
            aria-label={`Show or hide column ${column.label}`}
          />
        ) : (
          <Tooltip content="Key column: cannot be hidden" relationship="label">
            <span className={styles.cellCenter}>
              <LockClosedRegular fontSize={14} />
              <Text size={200}>Always visible</Text>
            </span>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className={styles.valueCell}>
        {column.writeBackAllowed ? (
          <span className={styles.cellCenter}>
            <Switch
              checked={column.writableToD365}
              disabled={writebackBusy}
              onChange={handleWriteback}
              aria-label={`Write-back to D365 for ${column.label}`}
            />
            {column.writableToD365 ? (
              <Badge appearance="tint" color="success" size="small" icon={<ArrowUploadRegular />}>
                Enabled
              </Badge>
            ) : (
              <Badge appearance="tint" color="informative" size="small">Available</Badge>
            )}
          </span>
        ) : (
          <Tooltip
            content={column.source === 'custom'
              ? 'Custom columns only exist in this app and are never written to D365'
              : 'Key or system field: write-back is not allowed'}
            relationship="label"
          >
            <Badge appearance="outline" color="subtle" size="small">Not available</Badge>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
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
            {columns.map((column) => {
              const fieldKey = String(column.d365Field || '').toLowerCase();
              const isRelationField = relationFields.has(fieldKey);
              const sampleValue = sampleByField[column.d365Field] || sampleByField[column.label] || '—';
              return (
                <ColumnConfigRow
                  key={column.id}
                  column={column}
                  sampleValue={sampleValue}
                  isRelationField={isRelationField}
                  togglingKey={togglingKey}
                  onToggleVisibility={onToggleVisibility}
                  onToggleWriteback={onToggleWriteback}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Text className={styles.muted}>
        Yellow-highlighted rows mark the 2 fields that join Purchase Order Headers and Purchase Order Lines.
      </Text>
    </div>
  );
}

/**
 * Gecombineerde tabel per entiteit: sampledata + kolomkeuzes (zichtbaarheid + write-back).
 */
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

