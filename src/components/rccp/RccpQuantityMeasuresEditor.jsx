import React, { memo, useCallback, useMemo } from 'react';
import {
  Button, Field, Select, Text, makeStyles, shorthands, tokens, mergeClasses,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

const CHART_TYPES = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
];

/** Labels als "Aantal" en "Aantal Total" lijken op elkaar; de kolomnaam maakt het eenduidig. */
function optionText(col) {
  const label = col.label || col.key;
  return label === col.key ? label : `${label} (${col.key})`;
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalMNudge), width: '100%' },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 88px 72px auto auto',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'end',
  },
  rowFlyout: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  rowFlyoutInline: {
    display: 'flex',
    alignItems: 'flex-end',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  fieldFlyout: { width: '100%' },
  compactControl: { width: '168px', maxWidth: '100%' },
  deleteFlyout: { flexShrink: 0 },
  colorField: { display: 'flex', alignItems: 'flex-end', minHeight: '32px' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function RccpQuantityMeasuresEditor({ measures, columns, compact, onChange }) {
  const styles = useStyles();
  // Welke kolommen als waardekolom mogen dienen, bepaalt de admin op de data model-tab
  // ("RCCP value column"). De config kent alleen columnKey, dus een key die in beide scopes
  // voorkomt levert één optie op — de regel wint, net als in de aggregatie op de server.
  const numberCols = useMemo(() => {
    const byKey = new Map();
    for (const col of columns) {
      if (!col.rccpMeasure) continue;
      if (!byKey.has(col.key) || col.scope === 'detail') byKey.set(col.key, col);
    }
    return [...byKey.values()];
  }, [columns]);

  const lineCols = useMemo(() => numberCols.filter((c) => c.scope === 'detail'), [numberCols]);
  const orderCols = useMemo(() => numberCols.filter((c) => c.scope !== 'detail'), [numberCols]);

  const updateMeasure = useCallback((index, patch) => {
    onChange(measures.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }, [measures, onChange]);

  // De eerste vrijgegeven kolom die nog niet als measure in gebruik is.
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
      <Text weight="semibold">Quantity measures</Text>
      <Text className={styles.hint}>
        Each measure becomes a matrix row and an optional chart series.
      </Text>
      {!numberCols.length && (
        <Text className={styles.hint}>
          No columns are released for RCCP yet. Enable “RCCP value column” for a number column
          under Admin → Data model.
        </Text>
      )}
      {measures.map((measure, index) => {
        // Een opgeslagen kolom die niet (meer) bruikbaar is, moet zichtbaar blijven staan.
        // Zonder eigen option toont de browser stilzwijgend de eerste optie, en dan overschrijft
        // Save de config met een kolom die niemand heeft gekozen.
        const isUnavailable = !numberCols.some((c) => c.key === measure.columnKey);
        return (
        <div key={`${measure.columnKey}-${index}`} className={compact ? styles.rowFlyout : styles.row}>
          <Field
            label="Column"
            className={compact ? styles.fieldFlyout : undefined}
            validationState={isUnavailable ? 'warning' : 'none'}
            validationMessage={isUnavailable ? 'This column has no value in RCCP. Pick another one.' : undefined}
          >
            <Select
              className={compact ? styles.compactControl : undefined}
              size={compact ? 'small' : 'medium'}
              value={measure.columnKey}
              onChange={(e) => {
                const col = numberCols.find((c) => c.key === e.target.value);
                updateMeasure(index, {
                  columnKey: e.target.value,
                  label: col?.label || e.target.value,
                });
              }}
            >
              {isUnavailable && (
                <option value={measure.columnKey}>
                  {`${measure.label || measure.columnKey} — unavailable`}
                </option>
              )}
              {lineCols.length > 0 && (
                <optgroup label="Order line — counts per line">
                  {lineCols.map((col) => (
                    <option key={col.key} value={col.key}>{optionText(col)}</option>
                  ))}
                </optgroup>
              )}
              {orderCols.length > 0 && (
                <optgroup label="Order header — spread across lines">
                  {orderCols.map((col) => (
                    <option key={col.key} value={col.key}>{optionText(col)}</option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
          <Field label="Chart">
            <Select
              className={compact ? styles.compactControl : undefined}
              size={compact ? 'small' : 'medium'}
              value={measure.chartType || 'line'}
              onChange={(e) => updateMeasure(index, { chartType: e.target.value })}
            >
              {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Color" className={compact ? styles.fieldFlyout : undefined}>
            <div className={styles.colorField}>
              <ColorPalettePicker
                layout={compact ? 'popover' : 'grid'}
                selectedColor={measure.color || SELECTABLE_STATUS_COLORS[0]}
                onSelect={(color) => updateMeasure(index, { color })}
                ariaLabel="Measure color"
              />
            </div>
          </Field>
          {compact ? (
            <div className={styles.rowFlyoutInline}>
              <Field label="In chart" className={styles.fieldFlyout}>
                <Select
                  className={styles.compactControl}
                  size="small"
                  value={measure.showInChart === false ? 'no' : 'yes'}
                  onChange={(e) => updateMeasure(index, { showInChart: e.target.value === 'yes' })}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Field>
              <Button
                className={styles.deleteFlyout}
                appearance="subtle"
                icon={<Delete24Regular />}
                disabled={measures.length <= 1}
                onClick={() => removeMeasure(index)}
                aria-label="Remove measure"
              />
            </div>
          ) : (
            <>
              <Field label="In chart">
                <Select
                  size="medium"
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
            </>
          )}
        </div>
        );
      })}
      <Button
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
