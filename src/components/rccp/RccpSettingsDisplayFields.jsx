import React, { memo, useCallback } from 'react';
import { Field, Input, Switch, Text, makeStyles, shorthands, tokens, InfoButton } from '@fluentui/react-components';
import RccpChartWeekRangesEditor from './RccpChartWeekRangesEditor';
import { rccpFieldLabel, RccpInfoLabel } from './rccpFieldLabel';

const useStyles = makeStyles({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXL),
    width: '100%',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  groupTitle: { color: tokens.colorNeutralForeground2 },
  pair: {
    display: 'grid',
    gridTemplateColumns: '96px 96px',
    justifyContent: 'start',
    width: 'max-content',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  slot: { width: '96px', minWidth: '96px', maxWidth: '96px' },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
});

function ThresholdInputs({ compact, green, orange, onGreen, onOrange }) {
  const styles = useStyles();
  return (
    <div className={styles.pair}>
      <div className={styles.slot}>
        <Field
          label={rccpFieldLabel('Green %', 'Load at or below this percentage is shown as green.')}
        >
          <Input
            size={compact ? 'small' : 'medium'}
            type="number"
            min={0}
            max={100}
            value={String(green)}
            onChange={onGreen}
          />
        </Field>
      </div>
      <div className={styles.slot}>
        <Field
          label={rccpFieldLabel('Orange %', 'Load up to this percentage is orange; above it is red.')}
        >
          <Input
            size={compact ? 'small' : 'medium'}
            type="number"
            min={0}
            max={100}
            value={String(orange)}
            onChange={onOrange}
          />
        </Field>
      </div>
    </div>
  );
}

function ChartOverlaySwitches({ config, onUpdateField }) {
  const styles = useStyles();
  const handleCapacity = useCallback((_, data) => onUpdateField('showCapacityLine', data.checked), [onUpdateField]);
  const handleWarning = useCallback((_, data) => onUpdateField('showWarningLine', data.checked), [onUpdateField]);

  return (
    <>
      <div className={styles.switchRow}>
        <Switch
          checked={config.showCapacityLine !== false}
          onChange={handleCapacity}
          label="Capacity line"
        />
        <InfoButton size="small" info="Shows weekly available capacity on the chart." />
      </div>
      <div className={styles.switchRow}>
        <Switch
          checked={config.showWarningLine !== false}
          onChange={handleWarning}
          label="Warning threshold line"
        />
        <InfoButton size="small" info="Shows the load warning threshold on the chart." />
      </div>
    </>
  );
}

function RccpSettingsDisplayFields({
  config, compact, onUpdateField, onRanges, onGreen, onOrange,
}) {
  const styles = useStyles();

  return (
    <div className={styles.stack}>
      <div className={styles.group}>
        <Text weight="semibold" className={styles.groupTitle}>
          <RccpInfoLabel info="Show or hide extra lines on the capacity chart.">
            Chart overlays
          </RccpInfoLabel>
        </Text>
        <ChartOverlaySwitches config={config} onUpdateField={onUpdateField} />
      </div>
      <div className={styles.group}>
        <Text weight="semibold" className={styles.groupTitle}>
          <RccpInfoLabel info="Colored week bands behind the capacity chart.">
            Week highlights
          </RccpInfoLabel>
        </Text>
        <RccpChartWeekRangesEditor
          ranges={config.chartWeekRanges || []}
          compact={compact}
          hideIntro
          onChange={onRanges}
        />
      </div>
      <div className={styles.group}>
        <Text weight="semibold" className={styles.groupTitle}>
          <RccpInfoLabel info="Color bands for capacity load in the matrix.">
            Matrix colors
          </RccpInfoLabel>
        </Text>
        <ThresholdInputs
          compact={compact}
          green={config.thresholds?.greenMax ?? 80}
          orange={config.thresholds?.orangeMax ?? 100}
          onGreen={onGreen}
          onOrange={onOrange}
        />
      </div>
    </div>
  );
}

export default memo(RccpSettingsDisplayFields);
