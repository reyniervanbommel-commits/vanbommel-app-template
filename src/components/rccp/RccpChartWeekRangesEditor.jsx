import React, { memo, useCallback } from 'react';
import {
  Button, Field, Input, Text, makeStyles, mergeClasses, shorthands, tokens,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalMNudge), width: '100%' },
  row: {
    display: 'grid',
    gridTemplateColumns: '72px 72px 72px 72px auto auto',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'end',
  },
  rowFlyout: {
    gridTemplateColumns: '1fr',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  fieldFlyout: { width: '100%' },
  compactControl: { width: '168px', maxWidth: '100%' },
  weekInput: { width: '72px', maxWidth: '100%' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  colorField: { display: 'flex', alignItems: 'flex-end', minHeight: '32px' },
});

function defaultRange(index) {
  const year = new Date().getUTCFullYear();
  return {
    fromYear: year,
    fromWeek: 1,
    toYear: year,
    toWeek: 4,
    color: SELECTABLE_STATUS_COLORS[index % SELECTABLE_STATUS_COLORS.length],
  };
}

function RccpChartWeekRangesEditor({ ranges = [], compact, onChange }) {
  const styles = useStyles();

  const updateRange = useCallback((index, patch) => {
    onChange(ranges.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }, [onChange, ranges]);

  const addRange = useCallback(() => {
    onChange([...ranges, defaultRange(ranges.length)]);
  }, [onChange, ranges]);

  const removeRange = useCallback((index) => {
    onChange(ranges.filter((_, i) => i !== index));
  }, [onChange, ranges]);

  return (
    <div className={styles.root}>
      <Text weight="semibold">Chart week ranges</Text>
      <Text className={styles.hint}>
        Highlight week ranges in the capacity chart with a background color.
      </Text>
      {ranges.map((range, index) => (
        <div key={`range-${index}`} className={mergeClasses(styles.row, compact && styles.rowFlyout)}>
          <Field label="From year" className={compact ? styles.fieldFlyout : undefined}>
            <Input
              className={compact ? styles.compactControl : styles.weekInput}
              size={compact ? 'small' : 'medium'}
              type="number"
              value={String(range.fromYear ?? '')}
              onChange={(e) => updateRange(index, { fromYear: Number(e.target.value) })}
            />
          </Field>
          <Field label="From week" className={compact ? styles.fieldFlyout : undefined}>
            <Input
              className={compact ? styles.compactControl : styles.weekInput}
              size={compact ? 'small' : 'medium'}
              type="number"
              min={1}
              max={53}
              value={String(range.fromWeek ?? '')}
              onChange={(e) => updateRange(index, { fromWeek: Number(e.target.value) })}
            />
          </Field>
          <Field label="To year" className={compact ? styles.fieldFlyout : undefined}>
            <Input
              className={compact ? styles.compactControl : styles.weekInput}
              size={compact ? 'small' : 'medium'}
              type="number"
              value={String(range.toYear ?? '')}
              onChange={(e) => updateRange(index, { toYear: Number(e.target.value) })}
            />
          </Field>
          <Field label="To week" className={compact ? styles.fieldFlyout : undefined}>
            <Input
              className={compact ? styles.compactControl : styles.weekInput}
              size={compact ? 'small' : 'medium'}
              type="number"
              min={1}
              max={53}
              value={String(range.toWeek ?? '')}
              onChange={(e) => updateRange(index, { toWeek: Number(e.target.value) })}
            />
          </Field>
          <Field label="Color" className={compact ? styles.fieldFlyout : undefined}>
            <div className={styles.colorField}>
              <ColorPalettePicker
                selectedColor={range.color || SELECTABLE_STATUS_COLORS[0]}
                onSelect={(color) => updateRange(index, { color })}
                ariaLabel="Range color"
              />
            </div>
          </Field>
          <Button
            appearance="subtle"
            icon={<Delete24Regular />}
            onClick={() => removeRange(index)}
            aria-label="Remove week range"
          />
        </div>
      ))}
      <Button appearance="secondary" icon={<Add24Regular />} onClick={addRange}>
        Add week range
      </Button>
    </div>
  );
}

export default memo(RccpChartWeekRangesEditor);
