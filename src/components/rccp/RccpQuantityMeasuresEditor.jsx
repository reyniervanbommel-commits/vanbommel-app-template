import React, { memo, useCallback, useMemo } from 'react';
import { Button, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';
import { isRccpQuantityColumn } from '../../utils/rccpQuantityColumns';
import RccpQuantityMeasureCard from './RccpQuantityMeasureCard';
import { assignChartRole, chartRoleForColumn } from './rccpChartRole';

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

function RccpQuantityMeasuresEditor({
  measures, columns, hideIntro, openMeasureKey, deliveredMeasureKey, onChange, onUpdateField,
}) {
  const styles = useStyles();
  const numberCols = useMemo(() => {
    const byKey = new Map();
    for (const col of columns) {
      if (!isRccpQuantityColumn(col)) continue;
      if (!byKey.has(col.key) || col.scope === 'detail') byKey.set(col.key, col);
    }
    return [...byKey.values()];
  }, [columns]);

  const updateMeasure = useCallback((index, patch) => {
    const prev = measures[index];
    onChange(measures.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
    if (patch.columnKey && patch.columnKey !== prev?.columnKey) {
      if (openMeasureKey === prev.columnKey) onUpdateField('openMeasureKey', patch.columnKey);
      if (deliveredMeasureKey === prev.columnKey) onUpdateField('deliveredMeasureKey', patch.columnKey);
    }
  }, [measures, onChange, openMeasureKey, deliveredMeasureKey, onUpdateField]);

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
    const removed = measures[index];
    onChange(measures.filter((_, i) => i !== index));
    if (!removed) return;
    const next = assignChartRole(openMeasureKey, deliveredMeasureKey, removed.columnKey, '');
    if (next.openMeasureKey !== openMeasureKey) onUpdateField('openMeasureKey', next.openMeasureKey);
    if (next.deliveredMeasureKey !== deliveredMeasureKey) {
      onUpdateField('deliveredMeasureKey', next.deliveredMeasureKey);
    }
  }, [measures, onChange, openMeasureKey, deliveredMeasureKey, onUpdateField]);

  const handleRole = useCallback((index, role) => {
    const columnKey = measures[index]?.columnKey;
    if (!columnKey) return;
    const next = assignChartRole(openMeasureKey, deliveredMeasureKey, columnKey, role);
    if (next.openMeasureKey !== openMeasureKey) onUpdateField('openMeasureKey', next.openMeasureKey);
    if (next.deliveredMeasureKey !== deliveredMeasureKey) {
      onUpdateField('deliveredMeasureKey', next.deliveredMeasureKey);
    }
  }, [measures, openMeasureKey, deliveredMeasureKey, onUpdateField]);

  return (
    <div className={styles.root}>
      {!hideIntro && (
        <Text className={styles.hint}>
          Admin → Data model “RCCP value column” is the allowlist. Each card picks one of
          those columns for the matrix. Chart role is optional: Open or Received.
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
          numberCols={numberCols}
          canRemove={measures.length > 1}
          chartRole={chartRoleForColumn(measure.columnKey, openMeasureKey, deliveredMeasureKey)}
          onUpdate={updateMeasure}
          onRemove={removeMeasure}
          onRole={handleRole}
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
