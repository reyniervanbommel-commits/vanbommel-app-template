import React, { useCallback, useState } from 'react';
import {
  Badge,
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { History20Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

const useStyles = makeStyles({
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    maxWidth: '100%',
  },
  trigger: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
    ...shorthands.padding('0'),
    color: tokens.colorNeutralForeground3,
    transitionProperty: 'opacity',
    transitionDuration: '120ms',
    transitionTimingFunction: 'ease',
  },
  content: { display: 'inline-flex', alignItems: 'center', maxWidth: '100%' },
  surface: {
    maxWidth: '340px',
    maxHeight: '360px',
    overflowY: 'auto',
    ...shorthands.padding('12px'),
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    marginBottom: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  entry: {
    ...shorthands.borderLeft('2px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0', '0', '0', '10px'),
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  user: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  transition: {
    fontSize: tokens.fontSizeBase300,
    marginTop: '2px',
    wordBreak: 'break-word',
  },
  oldValue: {
    color: tokens.colorNeutralForeground3,
    textDecorationLine: 'line-through',
  },
  arrow: {
    color: tokens.colorNeutralForeground3,
    ...shorthands.margin('0', '4px'),
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

const dateTimeFormat = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'short', timeStyle: 'short' });

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : dateTimeFormat.format(d);
}

// Weergave van een waarde volgens het kolomtype; leeg → em-dash.
function formatValue(value, dataType) {
  if (value === null || value === undefined || value === '') return '—';
  if (dataType === 'boolean') return value === 1 || value === true || value === '1' ? 'Ja' : 'Nee';
  return String(value);
}

const STATUS_LABEL = { pending: 'in behandeling', applied: 'toegepast', failed: 'mislukt' };
const STATUS_COLOR = { pending: 'warning', applied: 'success', failed: 'danger' };

function HistoryEntry({ entry, dataType, styles }) {
  const userLabel = entry.user?.name || entry.user?.email || 'Onbekende gebruiker';
  const showOld = entry.action !== 'insert';
  return (
    <div className={styles.entry}>
      <div className={styles.meta}>
        <span>{formatDateTime(entry.at)}</span>
        <span>·</span>
        <Tooltip content={entry.user?.email || ''} relationship="label">
          <span className={styles.user}>{userLabel}</span>
        </Tooltip>
        {entry.source === 'writeback' ? (
          <Badge appearance="tint" size="small">D365</Badge>
        ) : null}
        {entry.status ? (
          <Badge appearance="tint" size="small" color={STATUS_COLOR[entry.status] || 'informative'}>
            {STATUS_LABEL[entry.status] || entry.status}
          </Badge>
        ) : null}
      </div>
      <div className={styles.transition}>
        {showOld ? (
          <>
            <span className={styles.oldValue}>{formatValue(entry.oldValue, dataType)}</span>
            <span className={styles.arrow}>→</span>
          </>
        ) : null}
        <span>{formatValue(entry.newValue, dataType)}</span>
      </div>
    </div>
  );
}

/**
 * Toont een klokje vóór de celwaarde wanneer er historie bestaat.
 * Klik op dat klokje opent de cel-geschiedenis (audit trail) met wie/wat/wanneer.
 */
export default function CellHistoryPopover({ cellKeys, dataType, children, hasHistory = false }) {
  const styles = useStyles();
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  if (!hasHistory) {
    return children;
  }

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const params = new URLSearchParams({
        columnId: String(cellKeys.columnId),
        dataAreaId: cellKeys.dataAreaId ?? '',
        orderNumber: cellKeys.orderNumber ?? '',
      });
      if (cellKeys.lineNumber !== null && cellKeys.lineNumber !== undefined) {
        params.set('lineNumber', String(cellKeys.lineNumber));
      }
      const data = await apiRequest('/purchase-orders/history?' + params.toString());
      setHistory(Array.isArray(data?.history) ? data.history : []);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Geschiedenis laden mislukt');
      setStatus('error');
    }
  }, [cellKeys]);

  const onOpenChange = useCallback((_, data) => {
    if (data.open) load();
  }, [load]);

  return (
    <Popover withArrow size="small" onOpenChange={onOpenChange}>
      <div className={styles.wrapper}>
        <PopoverTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            size="small"
            className={styles.trigger}
            icon={<History20Regular />}
            aria-label="Geschiedenis tonen"
          />
        </PopoverTrigger>
        <span className={styles.content}>{children}</span>
      </div>
      <PopoverSurface className={styles.surface}>
        <div className={styles.title}>Geschiedenis</div>
        {status === 'loading' ? <Spinner size="tiny" label="Laden…" /> : null}
        {status === 'error' ? <div className={styles.error}>{error}</div> : null}
        {status === 'ready' && history.length === 0 ? (
          <div className={styles.info}>Nog geen wijzigingen vastgelegd.</div>
        ) : null}
        {status === 'ready' && history.length > 0 ? (
          <div className={styles.list}>
            {history.map((entry, index) => (
              <HistoryEntry key={index} entry={entry} dataType={dataType} styles={styles} />
            ))}
          </div>
        ) : null}
      </PopoverSurface>
    </Popover>
  );
}
