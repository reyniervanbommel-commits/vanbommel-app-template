import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Button, Switch, Text, makeStyles, shorthands, tokens, InfoButton } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';
import RccpWeekRangeCard from './RccpWeekRangeCard';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    width: '100%',
  },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  add: { alignSelf: 'flex-start' },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
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

function RccpChartWeekRangesEditor({ ranges = [], hideIntro, onChange }) {
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

  const stashRef = useRef(ranges);
  useEffect(() => {
    if (ranges.length) stashRef.current = ranges;
  }, [ranges]);

  const highlightsOn = ranges.length > 0;
  const handleToggle = useCallback((_, data) => {
    if (data.checked) {
      onChange(stashRef.current.length ? stashRef.current : [defaultRange(0)]);
      return;
    }
    onChange([]);
  }, [onChange]);

  return (
    <div className={styles.root}>
      <div className={styles.switchRow}>
        <Switch
          checked={highlightsOn}
          onChange={handleToggle}
          label="Show on chart"
        />
        <InfoButton size="small" info="Colored week bands behind the capacity chart." />
      </div>
      {!hideIntro && (
        <Text className={styles.hint}>
          Highlight week ranges in the capacity chart with a background color.
        </Text>
      )}
      {highlightsOn && ranges.map((range, index) => (
        <RccpWeekRangeCard
          key={`range-${index}`}
          range={range}
          index={index}
          onUpdate={updateRange}
          onRemove={removeRange}
        />
      ))}
      {highlightsOn && (
        <Button className={styles.add} appearance="secondary" icon={<Add24Regular />} onClick={addRange}>
          Add week range
        </Button>
      )}
    </div>
  );
}

export default memo(RccpChartWeekRangesEditor);
