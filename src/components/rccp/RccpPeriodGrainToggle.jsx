import React, { memo, useCallback } from 'react';
import { Radio, RadioGroup } from '@fluentui/react-components';
import {
  parseRccpPeriodGrain,
  RCCP_PERIOD_GRAIN_MONTH,
  RCCP_PERIOD_GRAIN_WEEK,
} from './rccpPeriodGrain';
import { useRccpToggleFrameStyles } from './rccpToggleFrameStyles';

function RccpPeriodGrainToggle({ value, onChange }) {
  const styles = useRccpToggleFrameStyles();
  const grain = parseRccpPeriodGrain(value);
  const handleChange = useCallback((_, data) => {
    onChange?.(data.value);
  }, [onChange]);

  return (
    <div className={styles.frame}>
      <RadioGroup
        className={styles.group}
        layout="horizontal"
        value={grain}
        onChange={handleChange}
        aria-label="View"
      >
        <Radio value={RCCP_PERIOD_GRAIN_WEEK} label="W" aria-label="Week" />
        <Radio value={RCCP_PERIOD_GRAIN_MONTH} label="M" aria-label="Month" />
      </RadioGroup>
    </div>
  );
}

export default memo(RccpPeriodGrainToggle);
