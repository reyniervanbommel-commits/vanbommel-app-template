import React, { memo, useCallback, useMemo } from 'react';
import { Dropdown, Option, makeStyles } from '@fluentui/react-components';

const LISTBOX_POSITIONING = { matchTargetSize: false };

const useStyles = makeStyles({
  trigger: {
    minWidth: '200px',
    width: '200px',
    maxWidth: '200px',
  },
  listbox: {
    minWidth: '420px',
    maxWidth: '560px',
  },
  option: {
    whiteSpace: 'nowrap',
  },
});

/**
 * Smalle gesloten dropdown; de open lijst is breder zodat lange kolomnamen leesbaar zijn.
 * @param {{
 *   size?: 'small' | 'medium',
 *   selectedValue: string,
 *   selectedText: string,
 *   options: { value: string, text: string }[],
 *   onSelect: (value: string) => void,
 *   placeholder?: string,
 * }} props
 */
function RccpNarrowDropdown({
  size = 'small',
  selectedValue,
  selectedText,
  options,
  onSelect,
  placeholder,
}) {
  const styles = useStyles();
  const listbox = useMemo(() => ({ className: styles.listbox }), [styles.listbox]);
  const handleSelect = useCallback((_, data) => {
    if (data.optionValue == null) return;
    onSelect(data.optionValue);
  }, [onSelect]);

  return (
    <Dropdown
      className={styles.trigger}
      size={size}
      value={selectedText}
      selectedOptions={selectedValue ? [selectedValue] : []}
      onOptionSelect={handleSelect}
      listbox={listbox}
      positioning={LISTBOX_POSITIONING}
      placeholder={placeholder}
      title={selectedText || undefined}
    >
      {options.map((opt) => (
        <Option key={opt.value} value={opt.value} text={opt.text} className={styles.option}>
          {opt.text}
        </Option>
      ))}
    </Dropdown>
  );
}

export default memo(RccpNarrowDropdown);
