import React, { memo, useCallback, useMemo } from 'react';
import { Button, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';
import { isRccpQuantityColumn } from '../../utils/rccpQuantityColumns';
import RccpQuantityMeasureCard from './RccpQuantityMeasureCard';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    width: '100%',
  },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  add: { alignSelf: 'flex-start' },
});

function RccpQuantityMeasuresEditor({ measures, columns, hideIntro, onChange }) {
  const styles = useStyles();
  const numberCols = useMemo(() => {
    const byKey = new Map();
    for (const col of columns) {
      if (!isRccpQuantityColumn(col)) continue;
      if (!byKey.has(col.key) || col.scope === 'detail') byKey.set(col.key, col);
    }
    return [...byKey.values()];
  }, [columns]);

  const lineCols = useMemo(() => numberCols.filter((c) => c.scope === 'detail'), [numberCols]);
  const orderCols = useMemo(() => numberCols.filter((c) => c.scope !== 'detail'), [numberCols]);

  const updateMeasure = useCallback((index, patch) => {
    onChange(measures.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }, [measures, onChange]);

  const nextFreeColumn = useMemo(
    () => numberCols.find((col) => !measures.some((m) => m.columnKey === col.key)) || null,
    [numberCols, measures],
  );

  const addMeasure = useCallback(() => {
    if (!nextFreeColumn) return;
    onChange([...measures, {
      columnKey: nextFreeColumn.key,
      label: nextFreeColumn.label || nextFreeColumn.key,
      chartType: 'line',
      color: SELECTABLE_STATUS_COLORS[4] || '#579bfc',
      showInChart: true,
    }]);
  }, [nextFreeColumn, measures, onChange]);

  const removeMeasure = useCallback((index) => {
    onChange(measures.filter((_, i) => i !== index));
  }, [measures, onChange]);

  return (
    <div className={styles.root}>
      {!hideIntro && (
        <Text className={styles.hint}>
          Each quantity is a matrix row and an optional chart series.
        </Text>
      )}
      {!numberCols.length && (
        <Text className={styles.hint}>
          No quantity columns found. Enable “RCCP value column” under Admin → Data model,
          or add a custom/formula total on the order header.
        </Text>
      )}
      {measures.map((measure, index) => (
        <RccpQuantityMeasureCard
          key={`${measure.columnKey}-${index}`}
          measure={measure}
          index={index}
          lineCols={lineCols}
          orderCols={orderCols}
          numberCols={numberCols}
          canRemove={measures.length > 1}
          onUpdate={updateMeasure}
          onRemove={removeMeasure}
        />
      ))}
      <Button
        className={styles.add}
        appearance="secondary"
        icon={<Add24Regular />}
        disabled={!nextFreeColumn}
        onClick={addMeasure}
        title={nextFreeColumn ? undefined : 'Every released column is already in use'}
      >
        Add quantity column
      </Button>
    </div>
  );
}

export default memo(RccpQuantityMeasuresEditor);
