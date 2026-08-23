import React, { memo, useCallback, useMemo } from 'react';
import { Field, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { rccpFieldLabel, RccpInfoLabel } from './rccpFieldLabel';
import RccpNarrowDropdown from './RccpNarrowDropdown';

const useStyles = makeStyles({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    width: '100%',
  },
  groupTitle: { color: tokens.colorNeutralForeground2 },
  slot: { width: '200px', maxWidth: '200px' },
});

function MeasureRoleSelect({
  label, info, value, measures, compact, onChange,
}) {
  const styles = useStyles();
  const options = useMemo(() => ([
    { value: '__none__', text: 'None' },
    ...measures.map((measure) => ({
      value: measure.columnKey,
      text: measure.label || measure.columnKey,
    })),
  ]), [measures]);
  const selectedText = options.find((opt) => opt.value === (value || '__none__'))?.text || 'None';
  const handleSelect = useCallback((key) => {
    onChange({ target: { value: key === '__none__' ? '' : key } });
  }, [onChange]);

  return (
    <div className={styles.slot}>
      <Field label={rccpFieldLabel(label, info)}>
        <RccpNarrowDropdown
          size={compact ? 'small' : 'medium'}
          selectedValue={value || '__none__'}
          selectedText={selectedText}
          options={options}
          onSelect={handleSelect}
        />
      </Field>
    </div>
  );
}

function RccpSettingsChartRoles({ config, compact, onUpdateField }) {
  const styles = useStyles();
  const measures = config.quantityMeasures || [];
  const openMeasureValue = measures.some((m) => m.columnKey === config.openMeasureKey)
    ? config.openMeasureKey
    : '';

  const handleOpen = useCallback((e) => onUpdateField('openMeasureKey', e.target.value), [onUpdateField]);
  const handleDelivered = useCallback((e) => onUpdateField('deliveredMeasureKey', e.target.value), [onUpdateField]);
  const handleRemaining = useCallback((e) => onUpdateField('remainingMeasureKey', e.target.value), [onUpdateField]);

  return (
    <div className={styles.stack}>
      <Text weight="semibold" className={styles.groupTitle}>
        <RccpInfoLabel info="Which quantity series the chart treats as open, delivered, and remaining.">
          Chart roles
        </RccpInfoLabel>
      </Text>
      <MeasureRoleSelect
        compact={compact}
        label="Open quantity"
        info="Used for overcapacity: available capacity minus this series."
        value={openMeasureValue}
        measures={measures}
        onChange={handleOpen}
      />
      <MeasureRoleSelect
        compact={compact}
        label="Delivered quantity"
        info="Shown below the chart baseline."
        value={config.deliveredMeasureKey ?? ''}
        measures={measures}
        onChange={handleDelivered}
      />
      <MeasureRoleSelect
        compact={compact}
        label="Remaining quantity"
        info="Shown as a positive series above the baseline."
        value={config.remainingMeasureKey ?? ''}
        measures={measures}
        onChange={handleRemaining}
      />
    </div>
  );
}

export default memo(RccpSettingsChartRoles);
