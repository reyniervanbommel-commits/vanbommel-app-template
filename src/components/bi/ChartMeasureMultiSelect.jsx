import React, { memo, useCallback, useMemo } from 'react';
import { Dropdown, Field, Option } from '@fluentui/react-components';

function ChartMeasureMultiSelect({
  columns,
  selectedKeys,
  onChange,
  disabled = false,
  size = 'medium',
}) {
  const uniqueColumns = useMemo(() => {
    const seen = new Set();
    return (columns || []).filter((col) => {
      if (seen.has(col.key)) return false;
      seen.add(col.key);
      return true;
    });
  }, [columns]);

  const columnByKey = useMemo(
    () => new Map(uniqueColumns.map((col) => [col.key, col])),
    [uniqueColumns],
  );

  const handleOptionSelect = useCallback((_, data) => {
    onChange(Array.isArray(data.selectedOptions) ? data.selectedOptions : []);
  }, [onChange]);

  const displayValue = useMemo(() => {
    if (!selectedKeys?.length) return '';
    if (selectedKeys.length === 1) {
      return columnByKey.get(selectedKeys[0])?.label || selectedKeys[0];
    }
    return `${selectedKeys.length} selected`;
  }, [selectedKeys, columnByKey]);

  return (
    <Field label="Values (measures)" hint="Select one or more numeric columns" size={size === 'small' ? 'small' : undefined}>
      <Dropdown
        multiselect
        size={size}
        disabled={disabled}
        placeholder="Select values…"
        selectedOptions={selectedKeys || []}
        value={displayValue}
        onOptionSelect={handleOptionSelect}
      >
        {uniqueColumns.map((col) => (
          <Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>
        ))}
      </Dropdown>
    </Field>
  );
}

export default memo(ChartMeasureMultiSelect);
