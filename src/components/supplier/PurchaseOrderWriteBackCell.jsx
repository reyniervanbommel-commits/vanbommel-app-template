import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Spinner, Tooltip, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import CellHistoryPopover from './CellHistoryPopover';
import WeekNumberCalendarPopover from './WeekNumberCalendarPopover';
import { getFormattedCellControlStyle, FORMATTED_CELL_TEXT_COLOR } from './columnTextStyleUtils';
import {
  isDateLikeColumn,
  normalizeDateValue,
  toCalendarValue,
  toDisplayDateValue,
  toInputValue,
} from '../../utils/writeBackDateUtils';

const useStyles = makeStyles({
  cell: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    minWidth: 0,
    width: '100%',
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
  ariaLabel,
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
  const savingRef = useRef(false);
  const isDate = isDateLikeColumn(column, value);
  const resolvedAriaLabel = ariaLabel || `${column.label} (write back to D365)`;

  useEffect(() => {
    const nextIsDate = isDateLikeColumn(column, value);
    setLocal(toInputValue(value, column.dataType, nextIsDate));
  }, [value, column.dataType, column.key, column.label]);
  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current); }, []);

  const onLocalChange = useCallback((_, data) => setLocal(data.value), []);

  const commit = useCallback(async (draftValue = local) => {
    if (savingRef.current || status === 'saving') return;
    const treatAsDate = isDateLikeColumn(column, value) || isDateLikeColumn(column, draftValue);
    const resolvedValue = treatAsDate ? normalizeDateValue(draftValue) : draftValue;
    const currentValue = treatAsDate ? normalizeDateValue(value) : toInputValue(value, column.dataType);
    if (resolvedValue === currentValue) return;
    savingRef.current = true;
    setStatus('saving');
    setError('');
    try {
      await onCorrect({ value: resolvedValue, basedOnValue: value });
      setLocal(toInputValue(resolvedValue, column.dataType, treatAsDate));
      setStatus('saved');
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Write-back failed');
      const fallback = err.remainingDisplayValue !== undefined && err.remainingDisplayValue !== null
        ? err.remainingDisplayValue
        : value;
      setLocal(toInputValue(fallback, column.dataType, treatAsDate));
    } finally {
      savingRef.current = false;
    }
  }, [local, value, column, onCorrect, status]);

  const commitLocal = useCallback(() => commit(local), [commit, local]);

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
        aria-label={resolvedAriaLabel}
        onChange={onLocalChange}
        onBlur={commitLocal}
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
      aria-label={resolvedAriaLabel}
      onChange={onLocalChange}
      onBlur={commitLocal}
      onKeyDown={onKeyDown}
    />
  );

  return (
    <span className={styles.cell}>
      {cellKeys ? (
        <CellHistoryPopover cellKeys={cellKeys} dataType={column.dataType} hasHistory={hasHistory}>
          {inputControl}
        </CellHistoryPopover>
      ) : (
        inputControl
      )}
      {status === 'saving' ? <Spinner size="extra-tiny" aria-label="Write back" /> : null}
      {status === 'saved' ? <span className={styles.saved}>✓</span> : null}
      {status === 'error' ? (
        <Tooltip content={error} relationship="label">
          <ErrorCircleRegular className={styles.errIcon} />
        </Tooltip>
      ) : null}
    </span>
  );
}
