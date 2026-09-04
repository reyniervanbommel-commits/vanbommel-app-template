import React, { memo, useCallback } from 'react';
import {
  Button, Input, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    width: 'max-content',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '40px 80px 64px',
    alignItems: 'center',
    justifyContent: 'start',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    width: 'max-content',
  },
  colLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  rowLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  yearBox: { width: '80px', minWidth: '0', maxWidth: '80px' },
  weekBox: { width: '64px', minWidth: '0', maxWidth: '64px' },
  colorRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  colorLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
});

function RccpWeekRangeCard({ range, index, onUpdate, onRemove }) {
  const styles = useStyles();

  const handleFromYear = useCallback((e) => {
    onUpdate(index, { fromYear: Number(e.target.value) });
  }, [index, onUpdate]);
  const handleFromWeek = useCallback((e) => {
    onUpdate(index, { fromWeek: Number(e.target.value) });
  }, [index, onUpdate]);
  const handleToYear = useCallback((e) => {
    onUpdate(index, { toYear: Number(e.target.value) });
  }, [index, onUpdate]);
  const handleToWeek = useCallback((e) => {
    onUpdate(index, { toWeek: Number(e.target.value) });
  }, [index, onUpdate]);
  const handleColor = useCallback((color) => {
    onUpdate(index, { color });
  }, [index, onUpdate]);
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Text weight="semibold">{`${range.fromYear} W${range.fromWeek} – ${range.toYear} W${range.toWeek}`}</Text>
        <Button
          appearance="subtle"
          icon={<Delete24Regular />}
          onClick={handleRemove}
          aria-label={`Remove week range ${index + 1}`}
        />
      </div>
      <div className={styles.grid}>
        <span />
        <Text className={styles.colLabel}>Year</Text>
        <Text className={styles.colLabel}>Week</Text>
        <Text className={styles.rowLabel}>From</Text>
        <div className={styles.yearBox}>
          <Input
            size="small"
            type="number"
            aria-label="From year"
            value={String(range.fromYear ?? '')}
            onChange={handleFromYear}
          />
        </div>
        <div className={styles.weekBox}>
          <Input
            size="small"
            type="number"
            min={1}
            max={53}
            aria-label="From week"
            value={String(range.fromWeek ?? '')}
            onChange={handleFromWeek}
          />
        </div>
        <Text className={styles.rowLabel}>To</Text>
        <div className={styles.yearBox}>
          <Input
            size="small"
            type="number"
            aria-label="To year"
            value={String(range.toYear ?? '')}
            onChange={handleToYear}
          />
        </div>
        <div className={styles.weekBox}>
          <Input
            size="small"
            type="number"
            min={1}
            max={53}
            aria-label="To week"
            value={String(range.toWeek ?? '')}
            onChange={handleToWeek}
          />
        </div>
      </div>
      <div className={styles.colorRow}>
        <Text className={styles.colorLabel}>Color</Text>
        <ColorPalettePicker
          layout="popover"
          selectedColor={range.color || SELECTABLE_STATUS_COLORS[0]}
          onSelect={handleColor}
          ariaLabel={`Range ${index + 1} color`}
        />
      </div>
    </div>
  );
}

export default memo(RccpWeekRangeCard);
