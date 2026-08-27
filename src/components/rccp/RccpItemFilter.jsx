import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Combobox, Field, Option, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  field: { maxWidth: '280px', minWidth: '180px' },
  listbox: {
    minWidth: '280px',
    maxWidth: '420px',
  },
  option: {
    whiteSpace: 'nowrap',
  },
});

const LISTBOX_POSITIONING = { matchTargetSize: false };
const ALL_ITEMS_LABEL = 'All items';

/**
 * Searchable unique-item filter for the RCCP capacity vs load chart.
 */
export default function RccpItemFilter({ value, onChange, items = [] }) {
  const styles = useStyles();
  const inputRef = useRef(null);
  const selectedLabel = value || ALL_ITEMS_LABEL;
  const [query, setQuery] = useState(selectedLabel);

  const listboxSlot = useMemo(() => ({ className: styles.listbox }), [styles.listbox]);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const isSearching = query.trim() !== '' && query !== selectedLabel;

  const filteredItems = useMemo(() => {
    if (!isSearching) return items;
    const term = query.trim().toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(term));
  }, [items, query, isSearching]);

  const showAllOption = !isSearching
    || ALL_ITEMS_LABEL.toLowerCase().includes(query.trim().toLowerCase());

  const handleOptionSelect = useCallback((_, data) => {
    if (data.optionValue === undefined) return;
    onChange(data.optionValue || '');
    setQuery(data.optionText || ALL_ITEMS_LABEL);
  }, [onChange]);

  const handleInputChange = useCallback((event) => {
    setQuery(event.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const handleInputFocus = useCallback((event) => {
    event.target.select();
  }, []);

  const handleOpenChange = useCallback((_, data) => {
    if (!data.open) return;
    requestAnimationFrame(() => {
      inputRef.current?.select?.();
    });
  }, []);

  const inputSlot = useMemo(() => ({
    ref: inputRef,
    onFocus: handleInputFocus,
  }), [handleInputFocus]);

  const hasItems = items.length > 0;

  return (
    <Field
      className={styles.field}
      label="Item"
      hint={hasItems ? undefined : 'No unique items in the selected weeks'}
    >
      <Combobox
        freeform
        disabled={!hasItems}
        value={query}
        selectedOptions={[value || '']}
        placeholder={hasItems ? 'Type item number...' : 'No items in this week range'}
        input={inputSlot}
        listbox={listboxSlot}
        positioning={LISTBOX_POSITIONING}
        onOptionSelect={handleOptionSelect}
        onOpenChange={handleOpenChange}
        onChange={handleInputChange}
        onBlur={handleBlur}
      >
        {showAllOption && (
          <Option value="" text={ALL_ITEMS_LABEL}>{ALL_ITEMS_LABEL}</Option>
        )}
        {filteredItems.map((item) => (
          <Option key={item} className={styles.option} value={item} text={item}>
            {item}
          </Option>
        ))}
      </Combobox>
    </Field>
  );
}
