import React, { memo } from 'react';
import {
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
  tableWrap: {
    width: '100%',
    maxHeight: '300px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  table: {
    minWidth: '100%',
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    minWidth: '140px',
  },
  valueCell: {
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
  },
});

function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function PreviewTable({ title, preview }) {
  const styles = useStyles();
  const columns = preview?.columns || [];
  const rows = preview?.rows || [];
  const sampled = preview?.sampledRows || 0;
  return (
    <div className={styles.section}>
      <Text weight="semibold">{title}</Text>
      <Text className={styles.empty}>
        Showing {rows.length} rows from {sampled} sampled rows (vertical scrollbar enabled).
      </Text>
      {!columns.length ? (
        <Text className={styles.empty}>No rows with values available yet.</Text>
      ) : (
        <div className={styles.tableWrap}>
          <Table size="small" className={styles.table}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHeaderCell key={column} className={styles.headerCell}>{column}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column}`} className={styles.valueCell}>
                      {display(row.values?.[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Volledige (sample) tabelweergave van header en subitems met verticale scrollbars.
 */
function DataPreviewTables({ previewTables }) {
  return (
    <>
      <PreviewTable title="Header table preview (all fields with values)" preview={previewTables?.header} />
      <PreviewTable title="Subitems table preview (all fields with values)" preview={previewTables?.line} />
    </>
  );
}

export default memo(DataPreviewTables);

