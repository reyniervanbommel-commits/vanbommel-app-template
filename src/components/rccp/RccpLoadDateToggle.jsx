import React, { memo, useCallback, useMemo } from 'react';
import { Radio, RadioGroup } from '@fluentui/react-components';
import {
  parseRccpPlanningDateMode,
  RCCP_PLANNING_DATE_CONFIRMED,
  RCCP_PLANNING_DATE_REQUESTED,
} from './rccpPeriodGrain';
import { useRccpToggleFrameStyles } from './rccpToggleFrameStyles';

export function confirmedToggleLabel(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return 'Conf.';
  return `Conf. ${Math.round(Number(percent))}%`;
}

function confirmedToggleAriaLabel(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return 'Confirmed';
  return `Confirmed ${Math.round(Number(percent))}%`;
}

function RccpLoadDateToggle({ value, onChange, confirmedPercent }) {
  const styles = useRccpToggleFrameStyles();
  const mode = parseRccpPlanningDateMode(value);
  const confirmedLabel = useMemo(() => confirmedToggleLabel(confirmedPercent), [confirmedPercent]);
  const confirmedAria = useMemo(
    () => confirmedToggleAriaLabel(confirmedPercent),
    [confirmedPercent],
  );
  const handleChange = useCallback((_, data) => {
    onChange?.(data.value);
  }, [onChange]);

  return (
    <div className={styles.frame}>
      <RadioGroup
        className={styles.group}
        layout="horizontal"
        value={mode}
        onChange={handleChange}
        aria-label="Load date"
      >
        <Radio value={RCCP_PLANNING_DATE_REQUESTED} label="Req." aria-label="Requested" />
        <Radio value={RCCP_PLANNING_DATE_CONFIRMED} label={confirmedLabel} aria-label={confirmedAria} />
      </RadioGroup>
    </div>
  );
}

export default memo(RccpLoadDateToggle);
