import React, { useCallback } from 'react';
import { Field, Select, Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  hint: { color: tokens.colorNeutralForeground3 },
});

export default function RccpVendorFilter({
  value,
  onChange,
  vendors,
  vendorColumnKey,
  loading,
  error,
}) {
  const styles = useStyles();

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
    >
      <Select value={value} onChange={handleChange}>
        <option value="">All vendors</option>
        {vendors.map((vendor) => (
          <option key={vendor} value={vendor}>{vendor}</option>
        ))}
      </Select>
      {error && <Text size={200} className={styles.hint}>{error}</Text>}
    </Field>
  );
}
