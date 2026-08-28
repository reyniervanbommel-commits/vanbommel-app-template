import React, { memo, useCallback, useMemo } from 'react';
import { Dropdown, Field, Option, makeStyles } from '@fluentui/react-components';
import { rccpFieldLabel } from './rccpFieldLabel';
import { isRccpItemNumberColumnKey } from './rccpItemPicker';

const useStyles = makeStyles({
  field: { maxWidth: '280px' },
});

function RccpItemPickerColumnsEditor({
  columns = [],
  selectedKeys = [],
  onChange,
  compact = false,
}) {
  const styles = useStyles();
  const uniqueColumns = useMemo(() => {
    const seen = new Set();
    return (columns || []).filter((col) => {
      if (!col?.key || isRccpItemNumberColumnKey(col.key)) return false;
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
    <Field
      className={styles.field}
      label={rccpFieldLabel(
        'Item picker columns',
        'Shown as extra columns after the unique item number in the Item dropdown.',
      )}
      hint="The unique item number stays first. Extra columns come from the item entity."
      size={compact ? 'small' : undefined}
    >
      <Dropdown
        multiselect
        size={compact ? 'small' : 'medium'}
        placeholder="Select item columns…"
        selectedOptions={selectedKeys || []}
        value={displayValue}
        onOptionSelect={handleOptionSelect}
      >
        {uniqueColumns.map((col) => (
          <Option key={col.key} value={col.key} text={col.label || col.key}>
            {col.label || col.key}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

export default memo(RccpItemPickerColumnsEditor);
