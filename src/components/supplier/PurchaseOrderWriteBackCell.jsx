import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Spinner, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import CellHistoryPopover from './CellHistoryPopover';
import WeekNumberCalendarPopover from './WeekNumberCalendarPopover';
import { getFormattedCellControlStyle, FORMATTED_CELL_TEXT_COLOR } from './columnTextStyleUtils';
import { useWriteBackCellLock } from '../../hooks/useWriteBackCellLock';

const useStyles = makeStyles({
  cell: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    minWidth: 0,
    width: '100%',
    color: tokens.colorBrandForeground1,
    '> input': {
      color: tokens.colorBrandForeground1,
    },
  },
  saved: { color: tokens.colorPaletteGreenForeground1, fontSize: tokens.fontSizeBase300, whiteSpace: 'nowrap' },
  errIcon: { color: tokens.colorPaletteRedForeground1 },
  queued: { backgroundColor: tokens.colorNeutralBackground3 },
});

const useFormattedControlStyles = makeStyles({
  formatted: {
    backgroundColor: 'var(--cell-format-bg)',
    '::before': {
      backgroundColor: 'var(--cell-format-bg)',
    },
    ':hover': {
      backgroundColor: 'var(--cell-format-bg)',
    },
    ':hover::before': {
      backgroundColor: 'var(--cell-format-bg)',
    },
    ':focus-within': {
      backgroundColor: 'var(--cell-format-bg)',
    },
    ':focus-within::before': {
      backgroundColor: 'var(--cell-format-bg)',
    },
  },
  formattedText: {
    color: FORMATTED_CELL_TEXT_COLOR,
    '> input': {
      color: FORMATTED_CELL_TEXT_COLOR,
    },
  },
});

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function isDateDataType(dataType) {
  const normalized = String(dataType || '').trim().toLowerCase();
  return normalized === 'date' || normalized === 'datetime' || normalized === 'date-time';
}

function normalizeDateValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const probe = new Date(Date.UTC(year, month - 1, day));
      if (
        probe.getUTCFullYear() === year
        && probe.getUTCMonth() === month - 1
        && probe.getUTCDate() === day
      ) {
        return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
      }
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
}

function toDisplayDateValue(value) {
  const normalized = normalizeDateValue(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value ?? '');
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function isDateLikeColumn(column, value) {
  if (isDateDataType(column?.dataType)) return true;
  const hints = `${String(column?.key || '')} ${String(column?.label || '')}`;
  if (/date|datum|aangemaakt|created/i.test(hints)) return true;
  if (typeof value === 'string') {
    return /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.test(value.trim());
  }
  return false;
}

function toInputValue(value, dataType, treatAsDate = false) {
  if (value === null || value === undefined) return '';
  if (treatAsDate || isDateDataType(dataType)) {
    return toDisplayDateValue(value);
  }
  return String(value);
}

function toCalendarValue(value) {
  const normalized = normalizeDateValue(value);
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
}

/**
 * Inline write-back-cel voor een D365-veld dat admin als terugschrijfbaar markeerde (#134).
 * Bewerken gebeurt direct in de cel (geen popup). Bij blur/Enter wordt de waarde teruggeschreven
 * naar D365; optimistic concurrency en conflicten worden inline getoond. Bij fout keert de oude
 * waarde terug en verschijnt een fout-icoon met de melding als tooltip.
 */
export default function PurchaseOrderWriteBackCell({
  column,
  value,
  onCorrect,
  cellKeys,
  hasHistory = false,
  cellBackgroundColor = '',
  isConditionalFormat = false,
}) {
  const styles = useStyles();
  const formattedStyles = useFormattedControlStyles();
  const formattedControlStyle = cellBackgroundColor
    ? getFormattedCellControlStyle(cellBackgroundColor, { useWhiteText: isConditionalFormat })
    : undefined;
  const formattedControlClassName = mergeClasses(
    styles.input,
    formattedControlStyle ? formattedStyles.formatted : undefined,
    isConditionalFormat ? formattedStyles.formattedText : undefined,
  );
  const formattedControlInlineStyle = formattedControlStyle
    ? {
      ...formattedControlStyle,
      '--cell-format-bg': formattedControlStyle.backgroundColor,
    }
    : undefined;
  const [local, setLocal] = useState(toInputValue(value, column.dataType, isDateLikeColumn(column, value)));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const savedTimer = useRef(null);
  const isDate = isDateLikeColumn(column, value);
  const jobLock = useWriteBackCellLock(column.key, cellKeys?.dataAreaId, cellKeys?.orderNumber);
  const locked = jobLock.status === 'queued' || jobLock.status === 'writing' || jobLock.status === 'failed';

  useEffect(() => {
    const nextIsDate = isDateLikeColumn(column, value);
    setLocal(toInputValue(value, column.dataType, nextIsDate));
  }, [value, column.dataType, column.key, column.label]);
  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current); }, []);

  const commit = useCallback(async (draftValue = local) => {
    if (locked) return;
    const treatAsDate = isDateLikeColumn(column, value) || isDateLikeColumn(column, draftValue);
    const resolvedValue = treatAsDate ? normalizeDateValue(draftValue) : draftValue;
    const currentValue = treatAsDate ? normalizeDateValue(value) : toInputValue(value, column.dataType);
    if (resolvedValue === currentValue) return; // niets gewijzigd
    setStatus('saving');
    setError('');
    try {
      const result = await onCorrect({ value: resolvedValue, basedOnValue: value });
      setLocal(toInputValue(resolvedValue, column.dataType, treatAsDate));
      if (result?.background) {
        setStatus('idle');
        return;
      }
      setStatus('saved');
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Write-back failed');
      setLocal(toInputValue(value, column.dataType, treatAsDate)); // oude waarde terug
    }
  }, [local, value, column, onCorrect, locked]);

  const openDatePicker = useCallback(() => {
    setCalendarOpen(true);
  }, []);

  const onCalendarSelect = useCallback((nextValue) => {
    setLocal(toDisplayDateValue(nextValue));
    commit(nextValue);
  }, [commit]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      setLocal(toInputValue(value, column.dataType, isDateLikeColumn(column, value)));
      e.currentTarget.blur();
    }
  }, [value, column]);

  const showSpinner = status === 'saving' || jobLock.status === 'writing';
  const showSaved = status === 'saved' && !jobLock.status;
  const errorMessage = jobLock.status === 'failed' ? (jobLock.errorMessage || error) : error;
  const statusAfter = showSpinner
    ? <Spinner size="extra-tiny" aria-label="Write back" />
    : showSaved
      ? <span className={styles.saved}>✓</span>
      : (status === 'error' || jobLock.status === 'failed')
        ? <ErrorCircleRegular className={styles.errIcon} title={errorMessage || undefined} />
        : undefined;

  const inputControl = isDate ? (
    <WeekNumberCalendarPopover
      open={calendarOpen}
      onOpenChange={setCalendarOpen}
      value={toCalendarValue(local)}
      onSelect={onCalendarSelect}
    >
      <Input
        className={formattedControlClassName}
        style={formattedControlInlineStyle}
        appearance="filled-lighter"
        size="small"
        type="text"
        inputMode="numeric"
        value={local}
        disabled={locked}
        contentAfter={statusAfter}
        aria-label={`${column.label} (write back to D365)`}
        onChange={(_, data) => setLocal(data.value)}
        onBlur={() => commit(local)}
        onKeyDown={onKeyDown}
        onDoubleClick={openDatePicker}
      />
    </WeekNumberCalendarPopover>
  ) : (
    <Input
      className={formattedControlClassName}
      style={formattedControlInlineStyle}
      appearance="filled-lighter"
      size="small"
      type={column.dataType === 'number' ? 'number' : 'text'}
      value={local}
      disabled={locked}
      contentAfter={statusAfter}
      aria-label={`${column.label} (write back to D365)`}
      onChange={(_, data) => setLocal(data.value)}
      onBlur={() => commit(local)}
      onKeyDown={onKeyDown}
    />
  );

  return (
    <span className={mergeClasses(styles.cell, jobLock.status === 'queued' ? styles.queued : undefined)}>
      {cellKeys ? (
        <CellHistoryPopover cellKeys={cellKeys} dataType={column.dataType} hasHistory={hasHistory}>
          {inputControl}
        </CellHistoryPopover>
      ) : (
        inputControl
      )}
    </span>
  );
}
