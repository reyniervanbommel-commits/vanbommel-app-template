import React, { memo, useCallback } from 'react';
import { Field, Radio, RadioGroup, makeStyles } from '@fluentui/react-components';
import { rccpFieldLabel } from './rccpFieldLabel';

const PLANNING_DATE_INFO = 'KPIs, overcapacity and bars above the axis follow this date. Received below the axis stays on the receipt date.';

const useStyles = makeStyles({
  field: { maxWidth: '280px' },
});

/**
 * Planning date radio: Requested vs Confirmed. Hidden when confirmedDateColumnKey is empty.
 */
function RccpPlanningDateSwitch({ value = 'requested', onChange, disabled }) {
  const styles = useStyles();
  const handleChange = useCallback((_, data) => {
    onChange?.(data.value);
  }, [onChange]);

  return (
    <Field
      className={styles.field}
      label={rccpFieldLabel('Planning date', PLANNING_DATE_INFO)}
      hint={PLANNING_DATE_INFO}
    >
      <RadioGroup
        layout="horizontal"
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        <Radio value="requested" label="Requested" />
        <Radio value="confirmed" label="Confirmed" />
      </RadioGroup>
    </Field>
  );
}

export default memo(RccpPlanningDateSwitch);
