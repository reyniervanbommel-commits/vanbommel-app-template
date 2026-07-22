import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Combobox, Field, Option, Spinner, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  field: { maxWidth: '280px', minWidth: '220px' },
});

const ALL_VENDORS_LABEL = 'All vendors';

function vendorLabel(vendor, vendorNames) {
  const name = vendorNames?.[vendor];
  return name ? `${vendor} — ${name}` : vendor;
}

/**
 * Searchable vendor filter for the RCCP dashboard.
 * Typing filters the vendor list by vendor number OR vendor name.
 */
export default function RccpVendorFilter({
  value,
  onChange,
  vendors,
  vendorNames,
  loading,
  error,
  autoFocus = false,
  onHighlightVendor,
}) {
  const styles = useStyles();
  const selectedLabel = value ? vendorLabel(value, vendorNames) : ALL_VENDORS_LABEL;
  const [query, setQuery] = useState(selectedLabel);

  // Keep the input text in sync when the selection changes from outside (e.g. default vendor on load)
  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const isSearching = query.trim() !== '' && query !== selectedLabel;

  const filteredVendors = useMemo(() => {
    if (!isSearching) return vendors;
    const term = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const name = (vendorNames?.[vendor] || '').toLowerCase();
      return vendor.toLowerCase().includes(term) || name.includes(term);
    });
  }, [vendors, vendorNames, query, isSearching]);

  // Terwijl de gebruiker zoekt en er nog maar één match overblijft, laad die vendor alvast op
  // de achtergrond (zie useRccpVendorPrefetch) — dekt het geval waarin iemand het volledige
  // vendornummer/naam intikt en direct kiest, zonder eerst door de lijst te navigeren.
  useEffect(() => {
    if (!onHighlightVendor || !isSearching || filteredVendors.length !== 1) return;
    onHighlightVendor(filteredVendors[0]);
  }, [onHighlightVendor, isSearching, filteredVendors]);

  const handleActiveOptionChange = useCallback((_, data) => {
    if (data.nextOption?.value) onHighlightVendor?.(data.nextOption.value);
  }, [onHighlightVendor]);

  const showAllOption = !isSearching
    || ALL_VENDORS_LABEL.toLowerCase().includes(query.trim().toLowerCase());

  const handleOptionSelect = useCallback((_, data) => {
    // Fluent's Combobox auto-clears the selection (optionValue undefined) while the typed
    // text no longer matches the current selection — that's not a real user pick, ignore it.
    if (data.optionValue === undefined) return;
    onChange(data.optionValue || '');
    setQuery(data.optionText || ALL_VENDORS_LABEL);
  }, [onChange]);

  const handleInputChange = useCallback((event) => {
    setQuery(event.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  if (loading) {
    return <Spinner size="tiny" label="Loading vendors..." />;
  }

  return (
    <Field
      className={styles.field}
      label="Vendor filter"
      validationState={error ? 'error' : 'none'}
      validationMessage={error || undefined}
    >
      <Combobox
        value={query}
        selectedOptions={[value || '']}
        placeholder="Search by vendor no. or name..."
        input={{ autoFocus }}
        onOptionSelect={handleOptionSelect}
        onActiveOptionChange={handleActiveOptionChange}
        onChange={handleInputChange}
        onBlur={handleBlur}
      >
        {showAllOption && (
          <Option value="" text={ALL_VENDORS_LABEL}>{ALL_VENDORS_LABEL}</Option>
        )}
        {filteredVendors.map((vendor) => {
          const label = vendorLabel(vendor, vendorNames);
          return (
            <Option
              key={vendor}
              value={vendor}
              text={label}
              onMouseEnter={() => onHighlightVendor?.(vendor)}
            >
              {label}
            </Option>
          );
        })}
      </Combobox>
    </Field>
  );
}
