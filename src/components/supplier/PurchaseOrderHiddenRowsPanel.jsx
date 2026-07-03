import React, { memo, useState } from 'react';
import {
  Badge,
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
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
    minWidth: '360px',
    maxWidth: '460px',
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
  list: {
    maxHeight: '320px',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    ...shorthands.padding('8px', '14px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke3),
  },
  rowInfo: { minWidth: 0 },
  orderNumber: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  rowMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  empty: {
    ...shorthands.padding('16px', '14px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

// Toont hoeveel verwijderde (verborgen) orders nog binnen de harde D365-filter vallen,
// met de mogelijkheid om ze per stuk of allemaal terug te zetten in het overzicht.
function PurchaseOrderHiddenRowsPanel({ hiddenRows, count, loading, restoring, onRestore }) {
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
            verborgen in D365-filter
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <div className={styles.header}>
          <span className={styles.headerText}>
            {count} verwijderde {count === 1 ? 'order valt' : 'orders vallen'} nog binnen de harde D365-filter.
          </span>
          <Button
            appearance="primary"
            size="small"
            icon={restoring ? <Spinner size="tiny" /> : <ArrowResetRegular />}
            onClick={handleRestoreAll}
            disabled={restoring || loading}
          >
            Alles terugzetten
          </Button>
        </div>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>Laden...</div>
          ) : hiddenRows.length === 0 ? (
            <div className={styles.empty}>Geen verborgen rijen.</div>
          ) : (
            hiddenRows.map((row) => (
              <div key={`${row.dataAreaId}|${row.orderNumber}`} className={styles.row}>
                <div className={styles.rowInfo}>
                  <div className={styles.orderNumber}>{row.orderNumber}</div>
                  <div className={styles.rowMeta}>
                    {[row.vendorName, row.status].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <Button
                  appearance="secondary"
                  size="small"
                  icon={<ArrowResetRegular />}
                  onClick={() => handleRestoreOne(row)}
                  disabled={restoring}
                >
                  Terugzetten
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(PurchaseOrderHiddenRowsPanel);
