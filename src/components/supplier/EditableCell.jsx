import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dropdown,
  Input,
  makeStyles,
  Option,
  shorthands,
  Spinner,
  Switch,
  tokens,
} from '@fluentui/react-components';
import CellHistoryPopover from './CellHistoryPopover';

const useStyles = makeStyles({
  cell: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    minWidth: '104px',
  },
  control: {
    minWidth: '96px',
    color: tokens.colorBrandForeground1,
    '> input': {
      color: tokens.colorBrandForeground1,
    },
    '> button': {
      color: tokens.colorBrandForeground1,
    },
  },
  hiddenDatePicker: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
  },
  status: {
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  saved: {
    color: tokens.colorPaletteGreenForeground1,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
});

// Normaliseert een datumwaarde naar yyyy-mm-dd voor de native date-input.
function toDateInputValue(value) {
  if (!value) return '';
  const str = String(value);
  // Reeds yyyy-mm-dd of ISO met tijd: pak het datumdeel.
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
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
 * Inline bewerkbare cel voor eigen (custom) kolommen. Rendert op basis van
 * dataType het juiste Fluent-control en slaat bij blur/change automatisch op
 * via onSave(value). Toont kort een opslaan-/fout-indicatie.
 */
export default function EditableCell({
  dataType,
  value,
  options,
  onSave,
  ariaLabel,
  cellKeys,
  hasHistory = false,
}) {
  const styles = useStyles();
  const [localValue, setLocalValue] = useState(dataType === 'date' ? toDateInputValue(value) : value);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const savedTimerRef = useRef(null);
  const datePickerRef = useRef(null);

  useEffect(() => {
    setLocalValue(dataType === 'date' ? toDateInputValue(value) : value);
  }, [dataType, value]);

  // Ruim de "opgeslagen"-timer op bij unmount (voorkomt state-update op unmounted component).
  useEffect(() => () => {
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
  }, []);

  const commit = useCallback(async (nextValue) => {
    const baseValue = dataType === 'date' ? toDateInputValue(value) : value;
    // Niets opslaan als de waarde niet wijzigde.
    if (nextValue === baseValue) return;
    setStatus('saving');
    try {
      await onSave(nextValue);
      setStatus('saved');
      // Reset de "opgeslagen"-indicatie na korte tijd.
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
      setLocalValue(baseValue); // herstel zichtbare waarde bij fout
    }
  }, [dataType, onSave, value]);

  const openDatePicker = useCallback(() => {
    const picker = datePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    }
  }, []);

  const renderStatus = () => {
    if (status === 'saving') return <Spinner size="extra-tiny" aria-label="Opslaan" />;
    if (status === 'saved') return <span className={`${styles.status} ${styles.saved}`}>Opgeslagen</span>;
    if (status === 'error') return <span className={`${styles.status} ${styles.errorText}`}>Mislukt</span>;
    return null;
  };

  let control = null;

  if (dataType === 'boolean') {
    control = (
      <Switch
        checked={Boolean(localValue)}
        aria-label={ariaLabel}
        onChange={(_, data) => {
          setLocalValue(data.checked);
          commit(data.checked);
        }}
      />
    );
  } else if (dataType === 'select') {
    const opts = Array.isArray(options) ? options : [];
    const selectedText = localValue == null ? '' : String(localValue);
    control = (
      <Dropdown
        className={styles.control}
        appearance="filled-lighter"
        size="small"
        aria-label={ariaLabel}
        value={selectedText}
        selectedOptions={selectedText ? [selectedText] : []}
        onOptionSelect={(_, data) => {
          setLocalValue(data.optionValue);
          commit(data.optionValue);
        }}
      >
        {opts.map((opt) => (
          <Option key={opt} value={opt}>
            {opt}
          </Option>
        ))}
      </Dropdown>
    );
  } else if (dataType === 'date') {
    control = (
      <>
        <Input
          className={styles.control}
          appearance="filled-lighter"
          size="small"
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={localValue == null ? '' : String(localValue)}
          onChange={(_, data) => setLocalValue(data.value)}
          onBlur={() => commit(normalizeDateValue(localValue))}
          onDoubleClick={openDatePicker}
        />
        <input
          ref={datePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.hiddenDatePicker}
          value={toDateInputValue(localValue)}
          onChange={(event) => {
            const nextValue = event.target.value;
            setLocalValue(nextValue);
            commit(nextValue);
          }}
        />
      </>
    );
  } else if (dataType === 'number') {
    control = (
      <Input
        className={styles.control}
        appearance="filled-lighter"
        size="small"
        type="number"
        aria-label={ariaLabel}
        value={localValue == null ? '' : String(localValue)}
        onChange={(_, data) => setLocalValue(data.value)}
        onBlur={() => commit(localValue === '' || localValue == null ? null : Number(localValue))}
      />
    );
  } else {
    // 'text' en fallback.
    control = (
      <Input
        className={styles.control}
        appearance="filled-lighter"
        size="small"
        aria-label={ariaLabel}
        value={localValue == null ? '' : String(localValue)}
        onChange={(_, data) => setLocalValue(data.value)}
        onBlur={() => commit(localValue)}
      />
    );
  }

  return (
    <div className={styles.cell}>
      {cellKeys ? (
        <CellHistoryPopover cellKeys={cellKeys} dataType={dataType} hasHistory={hasHistory}>
          {control}
        </CellHistoryPopover>
      ) : control}
      {renderStatus()}
    </div>
  );
}
