import React, { useCallback } from 'react';
import {
  Badge,
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
});

export default function DataPreviewColumnConfigRow({
  column,
  typeLabel,
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
      <TableCell className={styles.valueCell}>{typeLabel}</TableCell>
      <TableCell className={styles.valueCell} title={sampleValue}>{sampleValue}</TableCell>
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
