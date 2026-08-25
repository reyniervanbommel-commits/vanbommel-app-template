import React, { memo, useCallback } from 'react';
import { Field, Input, Switch, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  switchField: { alignSelf: 'flex-end' },
  yearInput: { width: '104px' },
  weekInput: { width: '84px' },
});

/**
 * ISO-week range plus a switch that limits dashboard KPI cards to that range.
 */
function RccpWeekWindowFields({ window, onWindowChange, kpiWindowOnly, onKpiWindowOnlyChange }) {
  const styles = useStyles();
  const handleToggle = useCallback((_, data) => {
    onKpiWindowOnlyChange(Boolean(data.checked));
  }, [onKpiWindowOnlyChange]);
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
