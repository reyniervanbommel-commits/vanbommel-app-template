import React, { memo, useCallback, useMemo } from 'react';
import {
  Button, Field, Input, Select, Text, makeStyles, shorthands, tokens, mergeClasses,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';

const CHART_TYPES = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
];

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('10px'), width: '100%' },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 88px 72px auto auto',
    ...shorthands.gap('8px'),
    alignItems: 'end',
  },
  rowFlyout: {
    gridTemplateColumns: '1fr',
    ...shorthands.gap('8px'),
  },
  fieldFlyout: { width: '100%' },
  controlShell: { maxWidth: '168px', overflowX: 'auto' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: '12px' },
});

function RccpQuantityMeasuresEditor({ measures, columns, compact, onChange }) {
  const styles = useStyles();
  const masterNumberCols = useMemo(
    () => columns.filter((c) => c.scope === 'master' && c.dataType === 'number'),
    [columns],
  );

  const updateMeasure = useCallback((index, patch) => {
    onChange(measures.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }, [measures, onChange]);

  const addMeasure = useCallback(() => {
    const nextKey = masterNumberCols.find(
      (col) => !measures.some((m) => m.columnKey === col.key),
    )?.key;
    if (!nextKey) return;
    onChange([...measures, {
      columnKey: nextKey,
      label: masterNumberCols.find((c) => c.key === nextKey)?.label || nextKey,
      chartType: 'line',
      color: '#0078D4',
      showInChart: true,
    }]);
  }, [masterNumberCols, measures, onChange]);

  const removeMeasure = useCallback((index) => {
    onChange(measures.filter((_, i) => i !== index));
  }, [measures, onChange]);

  return (
    <div className={styles.root}>
      <Text weight="semibold">Quantity measures (main table)</Text>
      <Text className={styles.hint}>
        Add numeric main-table columns. Each becomes a matrix row and optional chart series.
      </Text>
      {measures.map((measure, index) => (
        <div key={`${measure.columnKey}-${index}`} className={mergeClasses(styles.row, compact && styles.rowFlyout)}>
          <Field label="Column" className={compact ? styles.fieldFlyout : undefined}>
            <div className={compact ? styles.controlShell : undefined}>
              <Select
                size={compact ? 'small' : 'medium'}
                value={measure.columnKey}
                onChange={(e) => {
                  const col = masterNumberCols.find((c) => c.key === e.target.value);
                  updateMeasure(index, {
                    columnKey: e.target.value,
                    label: col?.label || e.target.value,
                  });
                }}
              >
                {masterNumberCols.map((col) => (
                  <option key={col.key} value={col.key}>{col.label || col.key}</option>
                ))}
              </Select>
            </div>
          </Field>
          <Field label="Chart">
            <Select
              size={compact ? 'small' : 'medium'}
              value={measure.chartType || 'line'}
              onChange={(e) => updateMeasure(index, { chartType: e.target.value })}
            >
              {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Color">
            <Input
              size={compact ? 'small' : 'medium'}
              type="color"
              value={measure.color || '#D13438'}
              onChange={(e) => updateMeasure(index, { color: e.target.value })}
            />
          </Field>
          <Field label="In chart">
            <Select
              size={compact ? 'small' : 'medium'}
              value={measure.showInChart === false ? 'no' : 'yes'}
              onChange={(e) => updateMeasure(index, { showInChart: e.target.value === 'yes' })}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <Button
            appearance="subtle"
            icon={<Delete24Regular />}
            disabled={measures.length <= 1}
            onClick={() => removeMeasure(index)}
            aria-label="Remove measure"
          />
        </div>
      ))}
      <Button
        appearance="secondary"
        icon={<Add24Regular />}
        disabled={measures.length >= masterNumberCols.length}
        onClick={addMeasure}
      >
        Add quantity column
      </Button>
    </div>
  );
}

export default memo(RccpQuantityMeasuresEditor);
