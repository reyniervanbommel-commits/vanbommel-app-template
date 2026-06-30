import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Spinner, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { CloudArrowUpRegular, ErrorCircleRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  cell: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px'), minWidth: '120px' },
  // Write-back-veld: subtiel onderscheiden (merk-icoon) van read-only D365-cellen.
  input: { minWidth: '100px' },
  wbIcon: { color: tokens.colorBrandForeground1, fontSize: tokens.fontSizeBase200 },
  saved: { color: tokens.colorPaletteGreenForeground1, fontSize: tokens.fontSizeBase300, whiteSpace: 'nowrap' },
  errIcon: { color: tokens.colorPaletteRedForeground1 },
});

function toInputValue(value, dataType) {
  if (value === null || value === undefined) return '';
  if (dataType === 'date') {
    const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : String(value);
  }
  return String(value);
}

/**
 * Inline write-back-cel voor een D365-veld dat admin als terugschrijfbaar markeerde (#134).
 * Bewerken gebeurt direct in de cel (geen popup). Bij blur/Enter wordt de waarde teruggeschreven
 * naar D365; optimistic concurrency en conflicten worden inline getoond. Bij fout keert de oude
 * waarde terug en verschijnt een fout-icoon met de melding als tooltip.
 */
export default function PurchaseOrderWriteBackCell({ column, value, onCorrect }) {
  const styles = useStyles();
  const [local, setLocal] = useState(toInputValue(value, column.dataType));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const savedTimer = useRef(null);

  useEffect(() => { setLocal(toInputValue(value, column.dataType)); }, [value, column.dataType]);
  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current); }, []);

  const commit = useCallback(async () => {
    if (local === toInputValue(value, column.dataType)) return; // niets gewijzigd
    setStatus('saving');
    setError('');
    try {
      await onCorrect({ value: local, basedOnValue: value });
      setStatus('saved');
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Terugschrijven mislukt');
      setLocal(toInputValue(value, column.dataType)); // oude waarde terug
    }
  }, [local, value, column.dataType, onCorrect]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') { setLocal(toInputValue(value, column.dataType)); e.currentTarget.blur(); }
  }, [value, column.dataType]);

  return (
    <span className={styles.cell}>
      <Tooltip content="Terugschrijven naar D365 bij wijzigen" relationship="label">
        <CloudArrowUpRegular className={styles.wbIcon} />
      </Tooltip>
      <Input
        className={styles.input}
        size="small"
        type={column.dataType === 'number' ? 'number' : (column.dataType === 'date' ? 'date' : 'text')}
        value={local}
        aria-label={`${column.label} (terugschrijven naar D365)`}
        onChange={(_, data) => setLocal(data.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
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
