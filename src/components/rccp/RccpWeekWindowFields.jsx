import React, { memo, useCallback } from 'react';
import { Field, Input, Radio, RadioGroup, Switch, makeStyles } from '@fluentui/react-components';
import { RCCP_PERIOD_GRAIN_MONTH, RCCP_PERIOD_GRAIN_WEEK } from './rccpPeriodGrain';

const useStyles = makeStyles({
  switchField: { alignSelf: 'flex-end' },
  yearInput: { width: '104px' },
  weekInput: { width: '84px' },
  viewField: { minWidth: '160px', maxWidth: '220px' },
});

/**
 * ISO-week range, chart/matrix week-or-month view, and KPI window switch.
 */
function RccpWeekWindowFields({
  window, onWindowChange, kpiWindowOnly, onKpiWindowOnlyChange, periodGrain, onPeriodGrainChange,
}) {
  const styles = useStyles();
  const handleToggle = useCallback((_, data) => {
    onKpiWindowOnlyChange(Boolean(data.checked));
  }, [onKpiWindowOnlyChange]);
  const handleGrain = useCallback((_, data) => {
    onPeriodGrainChange(data.value);
  }, [onPeriodGrainChange]);
  const handleField = useCallback((field) => (event) => {
    onWindowChange(field, Number(event.target.value));
  }, [onWindowChange]);

  return (
    <>
      <Field label="From year">
        <Input className={styles.yearInput} type="number" value={String(window.fromYear)} onChange={handleField('fromYear')} />
      </Field>
      <Field label="From week">
        <Input className={styles.weekInput} type="number" min={1} max={53} value={String(window.fromWeek)} onChange={handleField('fromWeek')} />
      </Field>
      <Field label="To year">
        <Input className={styles.yearInput} type="number" value={String(window.toYear)} onChange={handleField('toYear')} />
      </Field>
      <Field label="To week">
        <Input className={styles.weekInput} type="number" min={1} max={53} value={String(window.toWeek)} onChange={handleField('toWeek')} />
      </Field>
      <Field className={styles.viewField} label="View">
        <RadioGroup layout="horizontal" value={periodGrain} onChange={handleGrain}>
          <Radio value={RCCP_PERIOD_GRAIN_WEEK} label="Week" />
          <Radio value={RCCP_PERIOD_GRAIN_MONTH} label="Month" />
        </RadioGroup>
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
