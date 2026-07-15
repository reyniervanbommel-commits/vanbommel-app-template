import React, { memo, useCallback } from 'react';
import {
  Button, Checkbox, Field, Popover, PopoverSurface, PopoverTrigger,
  makeStyles, shorthands, Text, tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  trigger: { justifyContent: 'space-between', width: '100%' },
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    minWidth: '220px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('4px', '2px'),
    cursor: 'pointer',
  },
  surface: { ...shorthands.padding('8px') },
  placeholder: { color: tokens.colorNeutralForeground3 },
});

function ChartMeasureMultiSelect({ columns, selectedKeys, onChange, disabled = false }) {
  const styles = useStyles();
  const selectedSet = new Set(selectedKeys || []);

  const toggle = useCallback((key) => {
    const next = new Set(selectedKeys || []);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  }, [selectedKeys, onChange]);

  const summary = selectedKeys?.length
    ? columns.filter((col) => selectedSet.has(col.key)).map((col) => col.label).join(', ')
    : '';

  return (
    <Field label="Values (measures)" hint="Select one or more numeric columns">
      <Popover positioning="below-start">
        <PopoverTrigger disableButtonEnhancement>
          <Button
            className={styles.trigger}
            appearance="outline"
            icon={<ChevronDownRegular />}
            iconPosition="after"
            disabled={disabled}
          >
            {summary ? <Text>{summary}</Text> : <Text className={styles.placeholder}>Select values…</Text>}
          </Button>
        </PopoverTrigger>
        <PopoverSurface className={styles.surface}>
          <div className={styles.list} role="listbox" aria-label="Select measures">
            {columns.map((col) => (
              <label className={styles.item} key={col.key} htmlFor={`measure-${col.key}`}>
                <Checkbox
                  id={`measure-${col.key}`}
                  checked={selectedSet.has(col.key)}
                  onChange={() => toggle(col.key)}
                />
                <Text>{col.label}</Text>
              </label>
            ))}
          </div>
        </PopoverSurface>
      </Popover>
    </Field>
  );
}

export default memo(ChartMeasureMultiSelect);
