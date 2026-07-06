import React, { useCallback } from 'react';
import {
  Badge,
  Button,
  mergeClasses,
  Switch,
  TableCell,
  TableRow,
  Text,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowUploadRegular, LinkRegular, LockClosedRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
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
  deleteButton: { minWidth: '92px' },
});

export default function DataPreviewColumnConfigRow({
  column,
  typeLabel,
  sampleValue,
  isRelationField,
  togglingKey,
  onToggleVisibility,
  onToggleVisibleAtDelete,
  onToggleWriteback,
  onDeleteColumn,
}) {
  const styles = useStyles();
  const handleVisibility = useCallback(() => onToggleVisibility(column), [onToggleVisibility, column]);
  const handleVisibleAtDelete = useCallback(() => onToggleVisibleAtDelete(column), [onToggleVisibleAtDelete, column]);
  const handleWriteback = useCallback(() => onToggleWriteback(column), [onToggleWriteback, column]);
  const handleDelete = useCallback(() => {
    if (column.source !== 'custom') return;
    const ok = window.confirm(
      `Delete custom column "${column.label}"? This permanently removes the column and all related values from SQL.`
    );
    if (!ok) return;
    onDeleteColumn(column);
  }, [onDeleteColumn, column]);
  const visibilityBusy = togglingKey === `vis-${column.id}`;
  const visibleAtDeleteBusy = togglingKey === `vad-${column.id}`;
  const writebackBusy = togglingKey === `wb-${column.id}`;
  const deletingBusy = togglingKey === `del-${column.id}`;
  const bulkBusy = typeof togglingKey === 'string' && togglingKey.startsWith('bulk-');
  const rowClassName = mergeClasses(
    !column.isActive && styles.hiddenRow,
    isRelationField && styles.relationRow,
  );

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
      <TableCell className={styles.valueCell}>{typeLabel}</TableCell>
      <TableCell className={styles.valueCell} title={sampleValue}>{sampleValue}</TableCell>
      <TableCell className={styles.valueCell}>
        {column.hideAllowed ? (
          <Switch
            checked={column.isActive}
            disabled={visibilityBusy || bulkBusy}
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
        <Switch
          checked={column.visibleAtDelete}
          disabled={visibleAtDeleteBusy || bulkBusy}
          onChange={handleVisibleAtDelete}
          aria-label={`Show column ${column.label} in the delete popup`}
        />
      </TableCell>
      <TableCell className={styles.valueCell}>
        {column.writeBackAllowed ? (
          <span className={styles.cellCenter}>
            <Switch
              checked={column.writableToD365}
              disabled={writebackBusy || bulkBusy}
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
      <TableCell className={styles.valueCell}>
        {column.source === 'custom' ? (
          <Button
            className={styles.deleteButton}
            appearance="secondary"
            size="small"
            disabled={deletingBusy || bulkBusy}
            onClick={handleDelete}
          >
            {deletingBusy ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <Text size={200} className={styles.muted}>—</Text>
        )}
      </TableCell>
    </TableRow>
  );
}
