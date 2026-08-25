import React, { memo, useCallback, useMemo } from 'react';
import { Dropdown, Option, OptionGroup, makeStyles } from '@fluentui/react-components';
import { RCCP_COLUMN_GROUP_ORDER } from '../../utils/rccpColumnGroups';

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
    maxHeight: '360px',
  },
  option: {
    whiteSpace: 'nowrap',
  },
});

function partitionOptions(options) {
  const ungrouped = [];
  const byGroup = new Map();
  for (const opt of options) {
    if (!opt.group) {
      ungrouped.push(opt);
      continue;
    }
    const list = byGroup.get(opt.group) || [];
    list.push(opt);
    byGroup.set(opt.group, list);
  }
  const groups = RCCP_COLUMN_GROUP_ORDER
    .filter((label) => byGroup.has(label))
    .map((label) => ({ label, options: byGroup.get(label) }));
  return { ungrouped, groups };
}

/**
 * Smalle gesloten dropdown; de open lijst is breder en groepeert kolommen per entiteit.
 * @param {{
 *   size?: 'small' | 'medium',
 *   selectedValue: string,
 *   selectedText: string,
 *   options: { value: string, text: string, group?: string }[],
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
  const partitioned = useMemo(() => partitionOptions(options), [options]);
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
      {partitioned.ungrouped.map((opt) => (
        <Option key={opt.value} value={opt.value} text={opt.text} className={styles.option}>
          {opt.text}
        </Option>
      ))}
      {partitioned.groups.map((group) => (
        <OptionGroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <Option key={opt.value} value={opt.value} text={opt.text} className={styles.option}>
              {opt.text}
            </Option>
          ))}
        </OptionGroup>
      ))}
    </Dropdown>
  );
}

export default memo(RccpNarrowDropdown);
