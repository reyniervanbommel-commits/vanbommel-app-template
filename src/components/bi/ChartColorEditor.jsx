import React, { memo, useCallback } from 'react';
import { Field, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import ColorPalettePicker from '../shared/ColorPalettePicker';
import { defaultColorForIndex } from './biConstants';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('8px') },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    maxWidth: '320px',
  },
  label: { color: tokens.colorNeutralForeground2, fontWeight: 600, fontSize: '13px' },
  itemLabel: { minWidth: 0, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
});

function ChartColorEditor({ items, colors, onChange, wide = false, compact = false }) {
  const styles = useStyles();

  const handleSelect = useCallback((key, color) => {
    onChange({ ...colors, [key]: color });
  }, [colors, onChange]);

  if (!items.length) return null;

  return (
    <div className={styles.root}>
      <Text className={styles.label} style={compact ? { fontSize: '10px' } : undefined}>Colors</Text>
      {items.map((item, index) => (
        <div
          className={styles.row}
          key={item.key}
          style={wide ? { maxWidth: '100%' } : undefined}
        >
          <Text
            className={styles.itemLabel}
            title={item.label}
            style={compact ? { fontSize: '11px' } : undefined}
          >{item.label}</Text>
          <Field>
            <ColorPalettePicker
              layout="popover"
              selectedColor={colors?.[item.key] || defaultColorForIndex(index)}
              onSelect={(color) => handleSelect(item.key, color)}
              ariaLabel={`Color for ${item.label}`}
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

export default memo(ChartColorEditor);
