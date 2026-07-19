import React, { useCallback } from 'react';
import { Field, Select, Spinner } from '@fluentui/react-components';

export default function RccpVendorFilter({
  value,
  onChange,
  vendors,
  vendorNames,
  loading,
  error,
}) {
  const handleChange = useCallback((event) => {
    onChange(event.target.value);
  }, [onChange]);

  if (loading) {
    return <Spinner size="tiny" label="Loading vendors..." />;
  }

  return (
    <Field
      label="Vendor filter"
      validationState={error ? 'error' : 'none'}
      validationMessage={error || undefined}
    >
      <Select value={value} onChange={handleChange}>
        <option value="">All vendors</option>
        {vendors.map((vendor) => {
          const name = vendorNames?.[vendor];
          return (
            <option key={vendor} value={vendor}>
              {name ? `${vendor} — ${name}` : vendor}
            </option>
          );
        })}
      </Select>
    </Field>
  );
}
