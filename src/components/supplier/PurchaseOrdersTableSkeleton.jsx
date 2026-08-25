import React, { memo } from 'react';
import {
  Skeleton,
  SkeletonItem,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  purchaseOrderBoardHeaderHeight,
  purchaseOrderBoardRowHeight,
} from './purchaseOrderBoardLayout';

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const COLUMNS = [
  { key: 'select', bar: 'barNarrow' },
  { key: 'order', bar: 'barMedium' },
  { key: 'vendor', bar: 'barWide' },
  { key: 'status', bar: 'barMedium' },
  { key: 'date', bar: 'barMedium' },
  { key: 'qty', bar: 'barNarrow' },
];

const useStyles = makeStyles({
  host: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',
  },
  frame: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    height: purchaseOrderBoardHeaderHeight,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
    verticalAlign: 'middle',
  },
  cell: {
    height: purchaseOrderBoardRowHeight,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    verticalAlign: 'middle',
  },
  barNarrow: { maxWidth: '40%' },
  barMedium: { maxWidth: '70%' },
  barWide: { maxWidth: '90%' },
  skeleton: { display: 'block', width: '100%' },
});

function SkeletonHeaderRow({ styles }) {
  return (
    <TableRow>
      {COLUMNS.map((column) => (
        <TableHeaderCell key={column.key} className={styles.headerCell}>
          <SkeletonItem className={styles[column.bar]} size={16} />
        </TableHeaderCell>
      ))}
    </TableRow>
  );
}

function SkeletonBodyRow({ styles, rowKey }) {
  return (
    <TableRow>
      {COLUMNS.map((column) => (
        <TableCell key={`${rowKey}-${column.key}`} className={styles.cell}>
          <SkeletonItem className={styles[column.bar]} size={16} />
        </TableCell>
      ))}
    </TableRow>
  );
}

function SkeletonTable({ styles }) {
  return (
    <Table className={styles.table} aria-hidden="true">
      <TableHeader>
        <SkeletonHeaderRow styles={styles} />
      </TableHeader>
      <TableBody>
        {ROWS.map((rowKey) => (
          <SkeletonBodyRow key={rowKey} rowKey={rowKey} styles={styles} />
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Lightweight Fluent table skeleton for the PO board first-load / empty refresh.
 * Does not mount the real board table (no hooks, no order rows).
 */
function PurchaseOrdersTableSkeleton({ label = 'Loading purchase orders' }) {
  const styles = useStyles();
  return (
    <div className={styles.host}>
      <div className={styles.frame}>
        <Skeleton className={styles.skeleton} aria-label={label}>
          <SkeletonTable styles={styles} />
        </Skeleton>
      </div>
    </div>
  );
}

export default memo(PurchaseOrdersTableSkeleton);
