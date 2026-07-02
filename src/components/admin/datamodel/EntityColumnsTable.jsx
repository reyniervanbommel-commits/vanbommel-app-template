import React, { memo, useCallback } from 'react';
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
import { ArrowUploadRegular, LockClosedRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  titleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  hiddenRow: { opacity: 0.55 },
  cellCenter: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px') },
});

const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes/no',
  select: 'Choice list',
};

function ColumnRow({ column, togglingKey, onToggleVisibility, onToggleWriteback }) {
  const styles = useStyles();

  const handleVisibility = useCallback(() => onToggleVisibility(column), [onToggleVisibility, column]);
  const handleWriteback = useCallback(() => onToggleWriteback(column), [onToggleWriteback, column]);

  const visibilityBusy = togglingKey === `vis-${column.id}`;
  const writebackBusy = togglingKey === `wb-${column.id}`;

  return (
    <TableRow className={column.isActive ? undefined : styles.hiddenRow}>
      <TableCell>
        <Text weight="semibold">{column.label}</Text>
      </TableCell>
      <TableCell>
        {column.source === 'd365' ? (
          <span className={styles.mono}>{column.d365Field || '(derived)'}</span>
        ) : (
          <Badge appearance="tint" color="informative" size="small">Custom column</Badge>
        )}
      </TableCell>
      <TableCell>{DATA_TYPE_LABELS[column.dataType] || column.dataType}</TableCell>
      <TableCell>
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
      <TableCell>
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

/**
 * Kolombeheer per entiteit: zichtbaarheid in het PO-scherm + write-back-config.
 * Verborgen kolommen blijven in de registry (en cache) staan — alleen de weergave verandert.
 */
function EntityColumnsTable({ title, entityName, columns, togglingKey, onToggleVisibility, onToggleWriteback }) {
  const styles = useStyles();
  const visibleCount = columns.filter((c) => c.isActive).length;

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        <Text weight="semibold" size={400}>{title}</Text>
        <span className={styles.mono}>{entityName}</span>
        <Badge appearance="tint" color="brand" size="small">{visibleCount}/{columns.length} visible</Badge>
      </div>
      <Table size="small" aria-label={`Columns of ${title}`}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Column</TableHeaderCell>
            <TableHeaderCell>D365 field</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Visible in table</TableHeaderCell>
            <TableHeaderCell>Write-back to D365</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => (
            <ColumnRow
              key={column.id}
              column={column}
              togglingKey={togglingKey}
              onToggleVisibility={onToggleVisibility}
              onToggleWriteback={onToggleWriteback}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default memo(EntityColumnsTable);
