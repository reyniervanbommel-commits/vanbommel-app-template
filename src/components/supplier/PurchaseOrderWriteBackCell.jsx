import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Spinner, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import CellHistoryPopover from './CellHistoryPopover';

const useStyles = makeStyles({
  cell: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px'), minWidth: 0, width: '100%' },
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
  hiddenDatePicker: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
  },
});

function toInputValue(value, dataType) {
  if (value === null || value === undefined) return '';
  if (dataType === 'date') {
    const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : String(value);
  }
  return String(value);
}

function normalizeDateValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const directMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (directMatch) return directMatch[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
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
}) {
  const styles = useStyles();
  const [local, setLocal] = useState(toInputValue(value, column.dataType));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const savedTimer = useRef(null);
  const datePickerRef = useRef(null);
  const isDate = column.dataType === 'date';

  useEffect(() => { setLocal(toInputValue(value, column.dataType)); }, [value, column.dataType]);
  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current); }, []);

  const commit = useCallback(async (draftValue = local) => {
    const resolvedValue = column.dataType === 'date' ? normalizeDateValue(draftValue) : draftValue;
    if (resolvedValue === toInputValue(value, column.dataType)) return; // niets gewijzigd
    setStatus('saving');
    setError('');
    try {
      await onCorrect({ value: resolvedValue, basedOnValue: value });
      setLocal(toInputValue(resolvedValue, column.dataType));
      setStatus('saved');
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Terugschrijven mislukt');
      setLocal(toInputValue(value, column.dataType)); // oude waarde terug
    }
  }, [local, value, column.dataType, onCorrect]);

  const openDatePicker = useCallback(() => {
    const picker = datePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    }
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') { setLocal(toInputValue(value, column.dataType)); e.currentTarget.blur(); }
  }, [value, column.dataType]);

  const inputControl = (
    <>
      <Input
        className={styles.input}
        appearance="filled-lighter"
        size="small"
        type={column.dataType === 'number' ? 'number' : 'text'}
        inputMode={isDate ? 'numeric' : undefined}
        value={local}
        aria-label={`${column.label} (terugschrijven naar D365)`}
        onChange={(_, data) => setLocal(data.value)}
        onBlur={() => commit(local)}
        onKeyDown={onKeyDown}
        onDoubleClick={isDate ? openDatePicker : undefined}
      />
      {isDate ? (
        <input
          ref={datePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.hiddenDatePicker}
          value={toInputValue(local, 'date')}
          onChange={(event) => {
            const nextValue = event.target.value;
            setLocal(nextValue);
            commit(nextValue);
          }}
        />
      ) : null}
    </>
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
      {status === 'saving' ? <Spinner size="extra-tiny" aria-label="Terugschrijven" /> : null}
      {status === 'saved' ? <span className={styles.saved}>✓</span> : null}
      {status === 'error' ? (
        <Tooltip content={error} relationship="label">
          <ErrorCircleRegular className={styles.errIcon} />
        </Tooltip>
      ) : null}
    </span>
  );
}
