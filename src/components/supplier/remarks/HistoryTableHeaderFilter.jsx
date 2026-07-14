import React, { memo, useCallback } from 'react';

function HistoryTableHeaderFilter({
  label,
  value = '',
  options = [],
  optionItems = null,
  allLabel,
  ariaLabel,
  onChange,
}) {
  const handleChange = useCallback(
    (event) => {
      onChange?.(event);
    },
    [onChange]
  );

  if (!onChange) {
    return <th scope="col">{label}</th>;
  }

  const normalizedItems = optionItems
    || options.map((option) => ({ value: option, label: option }));

  return (
    <th scope="col" className="history-table-filter-header">
      <div className="history-table-header-cell">
        <span className="history-table-header-label">{label}</span>
        <select
          className="history-table-header-select"
          value={value}
          aria-label={ariaLabel || `Filter by ${label.toLowerCase()}`}
          onChange={handleChange}
        >
          {allLabel ? <option value="">{allLabel}</option> : null}
          {normalizedItems.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </th>
  );
}

export default memo(HistoryTableHeaderFilter);
