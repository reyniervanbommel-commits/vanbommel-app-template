import React, { memo, useCallback } from 'react';
import { Field, Radio, RadioGroup, Switch, makeStyles } from '@fluentui/react-components';
import {
  RCCP_PERIOD_GRAIN_MONTH,
  RCCP_PERIOD_GRAIN_WEEK,
} from './rccpPeriodGrain';
import RccpIsoWeekRangePicker from './RccpIsoWeekRangePicker';
import RccpLoadDateToggle from './RccpLoadDateToggle';

const useStyles = makeStyles({
  switchField: { alignSelf: 'flex-end' },
  viewField: { minWidth: '160px', maxWidth: '320px' },
  periodField: { minWidth: '220px', maxWidth: '280px' },
});

/**
 * ISO-week range picker, chart/matrix week-or-month view, and KPI window switch.
 */
function RccpWeekWindowFields({
  window, onWindowReplace, kpiWindowOnly, onKpiWindowOnlyChange, periodGrain, onPeriodGrainChange,
  analysis, onShowDataWindow, planningDateMode, onPlanningDateModeChange,
}) {
  const styles = useStyles();
  const handleToggle = useCallback((_, data) => {
    onKpiWindowOnlyChange(Boolean(data.checked));
  }, [onKpiWindowOnlyChange]);
  const handleGrain = useCallback((_, data) => {
    onPeriodGrainChange(data.value);
  }, [onPeriodGrainChange]);

  return (
    <>
      <Field className={styles.periodField} label="Period">
        <RccpIsoWeekRangePicker
          window={window}
          onReplaceWindow={onWindowReplace}
          analysis={analysis}
          onShowDataWindow={onShowDataWindow}
        />
      </Field>
      <Field className={styles.viewField} label="View">
        <RadioGroup layout="horizontal" value={periodGrain} onChange={handleGrain}>
          <Radio value={RCCP_PERIOD_GRAIN_WEEK} label="Week" />
          <Radio value={RCCP_PERIOD_GRAIN_MONTH} label="Month" />
        </RadioGroup>
      </Field>
      <Field className={styles.viewField} label="Load date">
          <RccpLoadDateToggle
            value={planningDateMode}
            onChange={onPlanningDateModeChange}
            confirmedPercent={analysis?.kpis?.confirmedPercent}
          />
      </Field>
      <Switch
        className={styles.switchField}
        label="KPIs in selected weeks"
        checked={kpiWindowOnly}
        onChange={handleToggle}
      />
    </>
  );
}

export default memo(RccpWeekWindowFields);
