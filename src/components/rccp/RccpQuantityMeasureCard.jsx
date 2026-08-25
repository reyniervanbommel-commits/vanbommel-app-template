import React, { memo, useCallback, useMemo } from 'react';
import {
  Button, Field, Select, Switch, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';
import RccpNarrowDropdown from './RccpNarrowDropdown';
import { rccpFieldLabel } from './rccpFieldLabel';
import { rccpColumnGroupLabel } from '../../utils/rccpColumnGroups';

const CHART_TYPES = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
];

function optionText(col) {
  const label = col.label || col.key;
  return label === col.key ? label : `${label} (${col.key})`;
}

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
  title: { minWidth: 0 },
  row: {
    display: 'grid',
    gridTemplateColumns: '120px max-content max-content',
    justifyContent: 'start',
    alignItems: 'end',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  field: { width: '200px', maxWidth: '200px' },
  chartSlot: { width: '120px', minWidth: '120px', maxWidth: '120px' },
  colorSlot: { width: 'max-content' },
  colorField: { display: 'flex', alignItems: 'flex-end', minHeight: '32px' },
});

function RccpQuantityMeasureCard({
  measure, index, numberCols, canRemove, chartRole, onUpdate, onRemove, onRole,
}) {
  const styles = useStyles();
  const isUnavailable = !numberCols.some((c) => c.key === measure.columnKey);
  const title = measure.label || measure.columnKey;

  const columnOptions = useMemo(() => {
    const list = [];
    if (isUnavailable) {
      list.push({ value: measure.columnKey, text: `${title} — unavailable` });
    }
    numberCols.forEach((col) => list.push({
      value: col.key,
      text: optionText(col),
      group: rccpColumnGroupLabel(col),
    }));
    return list;
  }, [isUnavailable, measure.columnKey, title, numberCols]);

  const handleColumn = useCallback((key) => {
    const col = numberCols.find((c) => c.key === key);
    onUpdate(index, { columnKey: key, label: col?.label || key });
  }, [index, numberCols, onUpdate]);

  const handleChart = useCallback((e) => {
    onUpdate(index, { chartType: e.target.value });
  }, [index, onUpdate]);

  const handleColor = useCallback((color) => {
    onUpdate(index, { color });
  }, [index, onUpdate]);

  const handleInChart = useCallback((_, data) => {
    onUpdate(index, { showInChart: data.checked });
  }, [index, onUpdate]);

  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  const handleRole = useCallback((e) => {
    onRole(index, e.target.value);
  }, [index, onRole]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Text weight="semibold" className={styles.title}>{title}</Text>
        <Button
          appearance="subtle"
          icon={<Delete24Regular />}
          disabled={!canRemove}
          onClick={handleRemove}
          aria-label={`Remove ${title}`}
        />
      </div>
      <div className={styles.field}>
        <Field
          label="Column"
          validationState={isUnavailable ? 'warning' : 'none'}
          validationMessage={isUnavailable ? 'This column has no value in RCCP. Pick another one.' : undefined}
        >
          <RccpNarrowDropdown
            selectedValue={measure.columnKey}
            selectedText={title}
            options={columnOptions}
            onSelect={handleColumn}
          />
        </Field>
      </div>
      <div className={styles.field}>
        <Field
          label={rccpFieldLabel(
            'Chart role',
            'Optional. Open = full-color boxes above the axis. Received = 50% opacity of this color above the axis, and 100% of the same color below the axis on the receipt date.',
          )}
        >
          <Select size="small" value={chartRole || ''} onChange={handleRole}>
            <option value="">Matrix row only</option>
            <option value="open">Open (boxes above)</option>
            <option value="delivered">Received (boxes below)</option>
          </Select>
        </Field>
      </div>
      <div className={styles.row}>
        {!chartRole && (
          <div className={styles.chartSlot}>
            <Field label="Chart type">
              <Select size="small" value={measure.chartType || 'line'} onChange={handleChart}>
                {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
          </div>
        )}
        <div className={styles.colorSlot}>
          <Field label="Color">
            <div className={styles.colorField}>
              <ColorPalettePicker
                layout="popover"
                selectedColor={measure.color || SELECTABLE_STATUS_COLORS[0]}
                onSelect={handleColor}
                ariaLabel={`${title} color`}
              />
            </div>
          </Field>
        </div>
        <Switch
          checked={measure.showInChart !== false}
          onChange={handleInChart}
          label="In chart"
        />
      </div>
    </div>
  );
}

export default memo(RccpQuantityMeasureCard);
