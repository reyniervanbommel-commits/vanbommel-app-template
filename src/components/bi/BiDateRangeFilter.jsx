import React, { memo, useCallback } from 'react';
import {
  Field, Input, makeStyles, shorthands, Switch, tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', ...shorthands.gap(tokens.spacingHorizontalM) },
  switchField: { alignSelf: 'flex-end' },
  yearInput: { width: '96px' },
  weekInput: { width: '76px' },
});

/**
 * Generiek week/jaar-datumfilter (zelfde velden als RCCP). Werkt op de datum-dimensie die elke
 * chart zelf gebruikt; charts zonder datum-dimensie blijven ongewijzigd. Een switch schakelt het
 * filter in/uit; de week/jaar-velden verschijnen zodra het aan staat.
 */
function BiDateRangeFilter({ enabled, onEnabledChange, isoWindow, onWindowChange }) {
  const styles = useStyles();

  const handleToggle = useCallback((_, data) => onEnabledChange(data.checked), [onEnabledChange]);
  const handleField = useCallback((field) => (_, data) => onWindowChange(field, data.value), [onWindowChange]);

  return (
    <div className={styles.root}>
      <Switch className={styles.switchField} label="Week filter" checked={enabled} onChange={handleToggle} />
      {enabled ? (
        <>
          <Field label="From year">
            <Input className={styles.yearInput} type="number" value={String(isoWindow.fromYear)} onChange={handleField('fromYear')} />
          </Field>
          <Field label="From week">
            <Input className={styles.weekInput} type="number" min={1} max={53} value={String(isoWindow.fromWeek)} onChange={handleField('fromWeek')} />
          </Field>
          <Field label="To year">
            <Input className={styles.yearInput} type="number" value={String(isoWindow.toYear)} onChange={handleField('toYear')} />
          </Field>
          <Field label="To week">
            <Input className={styles.weekInput} type="number" min={1} max={53} value={String(isoWindow.toWeek)} onChange={handleField('toWeek')} />
          </Field>
        </>
      ) : null}
    </div>
  );
}

export default memo(BiDateRangeFilter);
