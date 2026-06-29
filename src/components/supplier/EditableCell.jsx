import React, { useCallback, useEffect, useState } from 'react';
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

// AANNAME: DatePicker is niet beschikbaar in @fluentui/react-components@9.54
// (zit in een apart pakket). Per opdracht gebruiken we daarom een native
// <input type="date"> met een makeStyles-classname.

const useStyles = makeStyles({
  cell: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    minWidth: '120px',
  },
  control: {
    minWidth: '110px',
  },
  dateInput: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding('4px', '8px'),
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
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

/**
 * Inline bewerkbare cel voor eigen (custom) kolommen. Rendert op basis van
 * dataType het juiste Fluent-control en slaat bij blur/change automatisch op
 * via onSave(value). Toont kort een opslaan-/fout-indicatie.
 */
export default function EditableCell({ dataType, value, options, onSave, ariaLabel }) {
  const styles = useStyles();
  const [localValue, setLocalValue] = useState(value);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commit = useCallback(async (nextValue) => {
    // Niets opslaan als de waarde niet wijzigde.
    if (nextValue === value) return;
    setStatus('saving');
    try {
      await onSave(nextValue);
      setStatus('saved');
      // Reset de "opgeslagen"-indicatie na korte tijd.
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
      setLocalValue(value); // herstel zichtbare waarde bij fout
    }
  }, [onSave, value]);

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
      <input
        type="date"
        className={styles.dateInput}
        aria-label={ariaLabel}
        value={toDateInputValue(localValue)}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
      />
    );
  } else if (dataType === 'number') {
    control = (
      <Input
        className={styles.control}
        type="number"
        aria-label={ariaLabel}
        value={localValue == null ? '' : String(localValue)}
        onChange={(_, data) => setLocalValue(data.value)}
        onBlur={() => commit(localValue)}
      />
    );
  } else {
    // 'text' en fallback.
    control = (
      <Input
        className={styles.control}
        aria-label={ariaLabel}
        value={localValue == null ? '' : String(localValue)}
        onChange={(_, data) => setLocalValue(data.value)}
        onBlur={() => commit(localValue)}
      />
    );
  }

  return (
    <div className={styles.cell}>
      {control}
      {renderStatus()}
    </div>
  );
}
