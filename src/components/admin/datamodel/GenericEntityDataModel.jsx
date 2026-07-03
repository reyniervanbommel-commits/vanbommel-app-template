import React, { useMemo } from 'react';
import {
  Badge,
  Button,
  Spinner,
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
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { useGenericTableModel } from '../../../hooks/useGenericTableModel';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px'), width: '100%' },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    width: '100%',
  },
  titleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  spacer: { flexGrow: 1 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  tableWrap: {
    width: '100%',
    maxHeight: '430px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    ...shorthands.padding('8px', '12px'),
  },
  valueCell: { whiteSpace: 'nowrap', fontSize: tokens.fontSizeBase200, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' },
});

function formatSample(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee';
  return String(value);
}

function ColumnTable({ title, columns, sample }) {
  const styles = useStyles();
  if (!columns || !columns.length) return null;
  return (
    <div className={styles.section}>
      <Text weight="semibold">{title}</Text>
      <div className={styles.tableWrap}>
        <Table size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.headerCell}>Kolom</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Sleutel</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>D365-veld</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Type</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Herkomst</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Voorbeeldwaarde</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => (
              <TableRow key={`${col.scope}-${col.key}`}>
                <TableCell>{col.label}</TableCell>
                <TableCell><span className={styles.mono}>{col.key}</span></TableCell>
                <TableCell><span className={styles.mono}>{col.sourceField || '—'}</span></TableCell>
                <TableCell>{col.dataType}</TableCell>
                <TableCell>
                  {col.source === 'lookup' ? (
                    <Badge appearance="tint" color="brand" size="small">lookup</Badge>
                  ) : col.source === 'custom' ? (
                    <Badge appearance="tint" color="success" size="small">eigen</Badge>
                  ) : (
                    <Badge appearance="tint" color="informative" size="small">bron</Badge>
                  )}
                </TableCell>
                <TableCell className={styles.valueCell}>{formatSample(sample ? sample[col.key] : null)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Data model-weergave voor een generieke tb_*-tabel (vendors/items) via /api/data/:tableKey (#AB:161).
 * Toont de kolomdefinities + een voorbeeldwaarde uit de laatste sync, met een "Sync nu"-knop.
 */
export default function GenericEntityDataModel({ tableKey }) {
  const styles = useStyles();
  const model = useGenericTableModel(tableKey);

  const syncedLabel = useMemo(() => {
    if (!model.syncedAt) return 'Nog niet gesynchroniseerd';
    try {
      return `Laatste sync: ${new Date(model.syncedAt).toLocaleString('nl-NL')}`;
    } catch {
      return `Laatste sync: ${model.syncedAt}`;
    }
  }, [model.syncedAt]);

  if (model.loading) return <Spinner label={`${model.label} laden...`} />;

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Text size={500} weight="semibold">{model.label}</Text>
        <Badge appearance="outline" color={model.stale ? 'warning' : 'success'} size="small">
          {model.rowCount.toLocaleString('nl-NL')} rijen in cache
        </Badge>
        <span className={styles.muted}>{syncedLabel}</span>
        <div className={styles.spacer} />
        <Button
          appearance="secondary"
          icon={model.refreshing ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
          disabled={model.refreshing}
          onClick={model.refresh}
        >
          Sync nu
        </Button>
      </div>

      {model.error ? <Text className={styles.error} block>{model.error}</Text> : null}

      <ColumnTable title="Kolommen" columns={model.columns.master} sample={model.sample.master} />
      {model.hasDetail ? (
        <ColumnTable title="Detailkolommen" columns={model.columns.detail} sample={model.sample.detail} />
      ) : null}
    </div>
  );
}
