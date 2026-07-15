import React, { memo, useCallback } from 'react';

const SERVER_ACTION_OPTIONS = [
  { value: 'updated', label: 'Updated only' },
  { value: 'all', label: 'All actions' },
];

function HistoryFilterSelect({ id, label, value, options, allLabel, onChange }) {
  const handleChange = useCallback(
    (event) => {
      onChange?.(event);
    },
    [onChange]
  );

  return (
    <label className="history-filter-field" htmlFor={id}>
      <span className="history-filter-label">{label}</span>
      <select
        id={id}
        className="history-filter-select"
        value={value}
        aria-label={`Filter by ${label.toLowerCase()}`}
        onChange={handleChange}
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HistoryFilterBar({
  userFilter,
  userOptions,
  onUserFilterChange,
  actionFilter,
  actionOptions,
  onActionFilterChange,
  columnFilter,
  columnOptions,
  onColumnChange,
  useServerActionFilter = false,
  serverActionFilter = 'updated',
  onServerActionFilterChange,
}) {
  const actionSelectOptions = useServerActionFilter
    ? SERVER_ACTION_OPTIONS
    : actionOptions.map((option) => ({ value: option, label: option }));

  return (
    <div className="history-filter-bar" role="search" aria-label="History filters">
      <HistoryFilterSelect
        id="history-filter-action"
        label="Action"
        value={useServerActionFilter ? serverActionFilter : actionFilter}
        options={actionSelectOptions}
        allLabel={useServerActionFilter ? undefined : 'All actions'}
        onChange={useServerActionFilter ? onServerActionFilterChange : onActionFilterChange}
      />
      <HistoryFilterSelect
        id="history-filter-column"
        label="Column"
        value={columnFilter}
        options={columnOptions}
        allLabel="All columns"
        onChange={onColumnChange}
      />
      <HistoryFilterSelect
        id="history-filter-user"
        label="User"
        value={userFilter}
        options={userOptions.map((option) => ({ value: option, label: option }))}
        allLabel="All users"
        onChange={onUserFilterChange}
      />
    </div>
  );
}

export default memo(HistoryFilterBar);
