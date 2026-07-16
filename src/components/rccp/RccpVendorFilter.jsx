import React, { useCallback } from 'react';
import { Field, Select, Spinner } from '@fluentui/react-components';

export default function RccpVendorFilter({
  value,
  onChange,
  vendors,
  vendorColumnKey,
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
      hint={vendorColumnKey ? `Values from main table column: ${vendorColumnKey}` : undefined}
      validationState={error ? 'error' : 'none'}
      validationMessage={error || undefined}
    >
      <Select value={value} onChange={handleChange}>
        <option value="">All vendors</option>
        {vendors.map((vendor) => (
          <option key={vendor} value={vendor}>{vendor}</option>
        ))}
      </Select>
    </Field>
  );
}
