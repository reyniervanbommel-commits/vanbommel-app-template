import React from 'react';
import {
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  scroll: { maxHeight: '340px', overflowY: 'auto', ...shorthands.borderRadius('6px'), ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2) },
  since: { color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  muted: { color: tokens.colorNeutralForeground4 },
  empty: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function scopeLabel(scope) {
  return scope === 'detail' ? 'Line' : 'Header';
}

/**
 * AdminTrackChangesColumns — table with a tracking toggle per column.
 * The view only renders; state and saving live in the parent Settings component.
 *
 * @param {{
 *   columns: Array<{ id: number|string, label: string, source: string, scope: string }>,
 *   selectedIds: Set<string>,
 *   trackedSince: Record<string, string>,
 *   loading: boolean,
 *   onToggle: (id: string, checked: boolean) => void,
 *   formatDate: (iso: string) => string,
 * }} props
 */
export default function AdminTrackChangesColumns({ columns, selectedIds, trackedSince, loading, onToggle, formatDate }) {
  const styles = useStyles();
  if (loading) return <Spinner size="tiny" label="Loading columns..." />;
  if (!columns.length) return <Text className={styles.empty}>No trackable columns found.</Text>;

  return (
    <div className={styles.scroll}>
      <Table size="small" aria-label="Track changes columns">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Column</TableHeaderCell>
            <TableHeaderCell>Level</TableHeaderCell>
            <TableHeaderCell>Tracking</TableHeaderCell>
            <TableHeaderCell>Active since</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => {
            const id = String(col.id);
            const checked = selectedIds.has(id);
            const since = trackedSince[id];
            return (
              <TableRow key={id}>
                <TableCell>{col.label || `#${id}`}</TableCell>
                <TableCell>{scopeLabel(col.scope)}</TableCell>
                <TableCell>
                  <Switch
                    checked={checked}
                    onChange={(_e, data) => onToggle(id, Boolean(data.checked))}
                    aria-label={`Track changes for ${col.label || id}`}
                  />
                </TableCell>
                <TableCell>
                  {checked && since
                    ? <span className={styles.since}>{formatDate(since)}</span>
                    : <span className={styles.muted}>—</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
