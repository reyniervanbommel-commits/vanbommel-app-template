import React, { useCallback } from 'react';
import { Field, Input, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  field: {
    maxWidth: '120px',
  },
});

function KpiCardStyleFields({ style, onChange }) {
  const styles = useStyles();
  const handleThreshold = useCallback((_, data) => {
    const raw = data.value;
    onChange({ threshold: raw === '' ? null : raw });
  }, [onChange]);
  return (
    <div data-kpi-card-style-fields="">
      <Field className={styles.field} label="Threshold %">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={style.threshold == null ? '' : String(style.threshold)}
          onChange={handleThreshold}
          aria-label="Threshold percent"
        />
      </Field>
    </div>
  );
}

export default KpiCardStyleFields;
