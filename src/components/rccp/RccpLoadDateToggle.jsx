import React, { memo, useCallback, useMemo } from 'react';
import { ToggleButton, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import {
  parseRccpPlanningDateMode,
  RCCP_PLANNING_DATE_CONFIRMED,
  RCCP_PLANNING_DATE_REQUESTED,
} from './rccpPeriodGrain';

const useStyles = makeStyles({
  group: {
    display: 'inline-flex',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  button: {
    minWidth: '92px',
    ...shorthands.borderRadius('0'),
    ...shorthands.border('0'),
  },
  confirmed: {
    minWidth: '124px',
  },
  split: {
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke1),
  },
});

export function confirmedToggleLabel(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return 'Confirmed';
  return `Confirmed ${Math.round(Number(percent))}%`;
}

function RccpLoadDateToggle({ value, onChange, confirmedPercent }) {
  const styles = useStyles();
  const mode = parseRccpPlanningDateMode(value);
  const requested = mode === RCCP_PLANNING_DATE_REQUESTED;
  const confirmedLabel = useMemo(() => confirmedToggleLabel(confirmedPercent), [confirmedPercent]);
  const handleRequested = useCallback(() => {
    onChange?.(RCCP_PLANNING_DATE_REQUESTED);
  }, [onChange]);
  const handleConfirmed = useCallback(() => {
    onChange?.(RCCP_PLANNING_DATE_CONFIRMED);
  }, [onChange]);

  return (
    <div className={styles.group} role="radiogroup" aria-label="Load date">
      <ToggleButton
        role="radio"
        size="small"
        aria-checked={requested}
        checked={requested}
        appearance={requested ? 'primary' : 'subtle'}
        className={styles.button}
        onClick={handleRequested}
      >
        Requested
      </ToggleButton>
      <ToggleButton
        role="radio"
        size="small"
        aria-checked={!requested}
        checked={!requested}
        appearance={requested ? 'subtle' : 'primary'}
        className={mergeClasses(styles.button, styles.confirmed, styles.split)}
        onClick={handleConfirmed}
      >
        {confirmedLabel}
      </ToggleButton>
    </div>
  );
}

export default memo(RccpLoadDateToggle);
