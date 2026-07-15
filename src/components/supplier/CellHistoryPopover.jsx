import React, { useCallback, useState } from 'react';
import {
  Badge,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { apiRequest } from '../../utils/api';
import {
  formatHistoryDate,
  formatHistoryStatus,
  formatHistoryValue,
  historyStatusColor,
} from '../../utils/cellHistoryFormat';

const useStyles = makeStyles({
  wrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    overflow: 'visible',
  },
  trigger: {
    position: 'absolute',
    top: 'calc(-1 * var(--po-cell-padding-y, 0px))',
    right: 'calc(-1 * var(--po-cell-padding-x, 0px))',
    zIndex: 5,
    width: '9px',
    height: '9px',
    ...shorthands.padding('0'),
    ...shorthands.border('0'),
    backgroundColor: tokens.colorNeutralStroke2,
    clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
    cursor: 'pointer',
    transformOrigin: 'top right',
    transitionProperty: 'background-color, transform',
    transitionDuration: '120ms',
    transitionTimingFunction: 'ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralForeground3,
      transform: 'scale(1.1)',
    },
    ':focus-visible': {
      backgroundColor: tokens.colorNeutralForeground3,
      outlineColor: tokens.colorBrandStroke1,
      outlineStyle: 'solid',
      outlineWidth: '2px',
    },
  },
  content: { display: 'inline-flex', alignItems: 'center', width: '100%', maxWidth: '100%' },
  surface: {
    width: 'min(720px, calc(100vw - 32px))',
    maxWidth: '720px',
    maxHeight: '360px',
    overflowY: 'auto',
    ...shorthands.padding('12px'),
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    marginBottom: '8px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSizeBase200,
  },
  headerCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('6px', '8px'),
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  cell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('7px', '8px'),
    verticalAlign: 'top',
  },
  dateCell: { whiteSpace: 'nowrap' },
  user: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  valueCell: {
    minWidth: '110px',
    wordBreak: 'break-word',
  },
  statusList: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shorthands.gap('4px'),
  },
  info: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  error: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
  },
});

function HistoryRow({ entry, dataType, styles }) {
  const userLabel = entry.user?.name || entry.user?.email || 'Unknown user';
  return (
    <tr>
      <td className={`${styles.cell} ${styles.dateCell}`}>{formatHistoryDate(entry.at)}</td>
      <td className={styles.cell}>
        <Tooltip content={entry.user?.email || ''} relationship="label">
          <span className={styles.user}>{userLabel}</span>
        </Tooltip>
      </td>
      <td className={`${styles.cell} ${styles.valueCell}`}>
        {entry.action === 'insert' ? '—' : formatHistoryValue(entry.oldValue, dataType)}
      </td>
      <td className={`${styles.cell} ${styles.valueCell}`}>{formatHistoryValue(entry.newValue, dataType)}</td>
      <td className={styles.cell}>
        <div className={styles.statusList}>
          {entry.source === 'writeback' ? (
            <Badge appearance="tint" size="small">D365</Badge>
          ) : null}
          {entry.status ? (
            <Badge appearance="tint" size="small" color={historyStatusColor(entry.status)}>
              {formatHistoryStatus(entry.status)}
            </Badge>
          ) : null}
          {!entry.status && entry.source !== 'writeback' ? '—' : null}
        </div>
      </td>
    </tr>
  );
}

function HistoryTable({ entries, dataType, styles }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table} aria-label="Cell history">
        <thead>
          <tr>
            <th className={styles.headerCell}>Date</th>
            <th className={styles.headerCell}>User</th>
            <th className={styles.headerCell}>Previous value</th>
            <th className={styles.headerCell}>New value</th>
            <th className={styles.headerCell}>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <HistoryRow key={index} entry={entry} dataType={dataType} styles={styles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Toont een omgevouwen hoekje rechtsboven wanneer er historie bestaat.
 * Klik op het hoekje opent de cel-geschiedenis (audit trail) met wie/wat/wanneer.
 */
export default function CellHistoryPopover({ cellKeys, dataType, children, hasHistory = false }) {
  const styles = useStyles();
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const params = new URLSearchParams({ columnId: String(cellKeys.columnId) });
      const hasLine = cellKeys.lineNumber !== null && cellKeys.lineNumber !== undefined;
      params.set('partitionKey', cellKeys.dataAreaId ?? '');
      params.set('recordKey', cellKeys.orderNumber ?? '');
      if (hasLine) params.set('detailKey', String(cellKeys.lineNumber));
      const endpoint = '/data/purchase-orders/history?' + params.toString();
      const data = await apiRequest(endpoint);
      setHistory(Array.isArray(data?.history) ? data.history : []);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Failed to load history');
      setStatus('error');
    }
  }, [cellKeys]);

  const onOpenChange = useCallback((_, data) => {
    if (data.open) load();
  }, [load]);

  if (!hasHistory) {
    return children;
  }

  return (
    <Popover withArrow size="small" onOpenChange={onOpenChange}>
      <div className={styles.wrapper}>
        <PopoverTrigger disableButtonEnhancement>
          <button
            type="button"
            className={styles.trigger}
            aria-label="View cell history"
            title="View cell history"
            data-cell-history-trigger="true"
          />
        </PopoverTrigger>
        <span className={styles.content}>{children}</span>
      </div>
      <PopoverSurface className={styles.surface}>
        <div className={styles.title}>History</div>
        {status === 'loading' ? <Spinner size="tiny" label="Loading…" /> : null}
        {status === 'error' ? <div className={styles.error}>{error}</div> : null}
        {status === 'ready' && history.length === 0 ? (
          <div className={styles.info}>No changes have been recorded yet.</div>
        ) : null}
        {status === 'ready' && history.length > 0 ? (
          <HistoryTable entries={history} dataType={dataType} styles={styles} />
        ) : null}
      </PopoverSurface>
    </Popover>
  );
}
