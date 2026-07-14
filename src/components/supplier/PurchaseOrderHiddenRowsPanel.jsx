import React, { memo, useState } from 'react';
import {
  Badge,
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
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
import { EyeOffRegular, ArrowResetRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
  },
  surface: {
    ...shorthands.padding('0'),
    minWidth: '420px',
    maxWidth: '760px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    ...shorthands.padding('12px', '14px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  headerText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  tableWrap: {
    maxHeight: '340px',
    overflowY: 'auto',
    overflowX: 'auto',
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    fontWeight: tokens.fontWeightSemibold,
  },
  cell: {
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orderCell: {
    whiteSpace: 'nowrap',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  actionCell: { whiteSpace: 'nowrap', textAlign: 'right' },
  empty: {
    ...shorthands.padding('16px', '14px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

// Formatteert een celwaarde uit de hidden-rows API voor weergave.
function formatValue(value, dataType) {
  if (value === null || value === undefined || value === '') return '—';
  if (dataType === 'date' && typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Toont hoeveel verwijderde (verborgen) orders nog binnen de harde D365-filter vallen, in een
// tabel met de kolommen die admin op de Data model-pagina heeft aangezet (visible at delete),
// met de mogelijkheid om orders per stuk of allemaal terug te zetten in het overzicht.
function PurchaseOrderHiddenRowsPanel({ hiddenRows, columns = [], count, loading, restoring, onRestore }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  if (!count) return null;

  const handleRestoreOne = (row) => onRestore([{ dataAreaId: row.dataAreaId, orderNumber: row.orderNumber }]);
  const handleRestoreAll = () => onRestore(hiddenRows.map((row) => ({
    dataAreaId: row.dataAreaId,
    orderNumber: row.orderNumber,
  })));

  return (
    <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" size="small" icon={<EyeOffRegular />}>
          <span className={styles.trigger}>
            <Badge color="warning" appearance="tint">{count}</Badge>
            hidden in D365 filter
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <div className={styles.header}>
          <span className={styles.headerText}>
            {count} deleted {count === 1 ? 'order still falls' : 'orders still fall'} within the hard D365 filter.
          </span>
          <Button
            appearance="primary"
            size="small"
            icon={restoring ? <Spinner size="tiny" /> : <ArrowResetRegular />}
            onClick={handleRestoreAll}
            disabled={restoring || loading}
          >
            Restore all
          </Button>
        </div>
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.empty}>Loading...</div>
          ) : hiddenRows.length === 0 ? (
            <div className={styles.empty}>No hidden rows.</div>
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={styles.headerCell}>Order</TableHeaderCell>
                  {columns.map((column) => (
                    <TableHeaderCell key={column.key} className={styles.headerCell}>
                      {column.label}
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell className={styles.headerCell} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {hiddenRows.map((row) => (
                  <TableRow key={`${row.dataAreaId}|${row.orderNumber}`}>
                    <TableCell className={styles.orderCell}>{row.orderNumber}</TableCell>
                    {columns.map((column) => {
                      const text = formatValue(row.values?.[column.key], column.dataType);
                      return (
                        <TableCell key={column.key} className={styles.cell} title={text}>
                          {text}
                        </TableCell>
                      );
                    })}
                    <TableCell className={styles.actionCell}>
                      <Button
                        appearance="secondary"
                        size="small"
                        icon={<ArrowResetRegular />}
                        onClick={() => handleRestoreOne(row)}
                        disabled={restoring}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(PurchaseOrderHiddenRowsPanel);
