import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Checkbox, Dropdown, Field, Option, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';

const LISTBOX_POSITIONING = {
  mountNode: typeof document !== 'undefined' ? document.body : undefined,
};

const useStyles = makeStyles({
  card: {
    position: 'fixed',
    zIndex: 2000000,
    pointerEvents: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    boxShadow: tokens.shadow8,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    maxWidth: '280px',
  },
  field: { maxWidth: '260px' },
});

function formatVersionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function isOutsidePin(event, box) {
  if (box?.contains(event.target)) return false;
  if (event.target?.closest?.('[role="listbox"]')) return false;
  return true;
}

/**
 * Interactive pin overlay: confirmed status, version listbox, show-all checkbox.
 */
function RccpPoSegmentPinCard({
  pin,
  onClose,
  versions = [],
  selectedDate = '',
  onSelectedDateChange,
  showAll = false,
  onShowAllChange,
}) {
  const styles = useStyles();
  const boxRef = useRef(null);
  const versionOptions = useMemo(
    () => (versions || []).map((version) => ({
      value: version.date,
      text: formatVersionDate(version.date),
    })),
    [versions],
  );

  const handleKey = useCallback((event) => {
    if (event.key === 'Escape') onClose?.();
  }, [onClose]);

  const handlePointerDown = useCallback((event) => {
    if (isOutsidePin(event, boxRef.current)) onClose?.();
  }, [onClose]);

  const handleOptionSelect = useCallback((_, data) => {
    if (data.optionValue === undefined) return;
    onSelectedDateChange?.(data.optionValue || '');
  }, [onSelectedDateChange]);

  const handleShowAll = useCallback((_, data) => {
    onShowAllChange?.(Boolean(data.checked));
  }, [onShowAllChange]);

  useEffect(() => {
    if (!pin) return undefined;
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [pin, handleKey, handlePointerDown]);

  if (!pin || typeof document === 'undefined') return null;

  const selectedLabel = selectedDate ? formatVersionDate(selectedDate) : 'Current';

  return createPortal(
    <div
      ref={boxRef}
      className={styles.card}
      style={{ left: pin.x, top: pin.y, pointerEvents: 'auto' }}
      role="dialog"
      aria-label="Segment details"
    >
      <Text>{`Item: ${pin.segment?.itemNumber || pin.itemNumber || '—'}`}</Text>
      <Text>Status: Confirmed</Text>
      <Text>{`Quantity: ${pin.segment?.qty ?? '—'}`}</Text>
      <Text>{`Week: ${pin.label || ''}`}</Text>
      <Field className={styles.field} label="Version">
        <Dropdown
          value={selectedLabel}
          selectedOptions={[selectedDate || '']}
          onOptionSelect={handleOptionSelect}
          positioning={LISTBOX_POSITIONING}
        >
          <Option value="" text="Current">Current</Option>
          {versionOptions.map((option) => (
            <Option key={option.value} value={option.value} text={option.text}>
              {option.text}
            </Option>
          ))}
        </Dropdown>
      </Field>
      {versions.length > 1 ? (
        <Checkbox
          label="Show all versions"
          checked={showAll}
          onChange={handleShowAll}
        />
      ) : null}
    </div>,
    document.body,
  );
}

export default memo(RccpPoSegmentPinCard);
