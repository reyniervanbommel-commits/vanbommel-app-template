import React, { memo, useCallback, useMemo } from 'react';
import { Checkbox, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  isRccpDualPlanningDate,
  parseRccpPlanningDateModes,
  toggleRccpPlanningDateMode,
  RCCP_PLANNING_DATE_CONFIRMED,
  RCCP_PLANNING_DATE_REQUESTED,
} from './rccpPeriodGrain';
import { useRccpToggleFrameStyles } from './rccpToggleFrameStyles';

const useStyles = makeStyles({
  group: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
  checkbox: {
    '& .fui-Checkbox__indicator': {
      marginTop: 0,
      marginBottom: 0,
      marginLeft: tokens.spacingHorizontalXXS,
      marginRight: tokens.spacingHorizontalXXS,
      width: '14px',
      height: '14px',
    },
    '& .fui-Checkbox__label': {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: tokens.spacingHorizontalXXS,
      paddingRight: tokens.spacingHorizontalXS,
      fontSize: tokens.fontSizeBase200,
      lineHeight: tokens.lineHeightBase200,
    },
  },
});

export function confirmedToggleLabel(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return 'Conf.';
  return `Conf. ${Math.round(Number(percent))}%`;
}

function confirmedToggleAriaLabel(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return 'Confirmed';
  return `Confirmed ${Math.round(Number(percent))}%`;
}

const LAST_MODE_HINT = 'At least one load date stays on';

/**
 * Requested and confirmed load date as two independent toggles. Both on shows both series in
 * the chart and both quantities in the matrix; the last active one cannot be switched off.
 */
function RccpLoadDateToggle({ value, onChange, confirmedPercent }) {
  const frameStyles = useRccpToggleFrameStyles();
  const styles = useStyles();
  const modes = useMemo(() => parseRccpPlanningDateModes(value), [value]);
  const both = isRccpDualPlanningDate(modes);
  const confirmedLabel = useMemo(() => confirmedToggleLabel(confirmedPercent), [confirmedPercent]);
  const confirmedAria = useMemo(
    () => confirmedToggleAriaLabel(confirmedPercent),
    [confirmedPercent],
  );

  const handleRequested = useCallback((_, data) => {
    onChange?.(toggleRccpPlanningDateMode(modes, RCCP_PLANNING_DATE_REQUESTED, data.checked));
  }, [modes, onChange]);
  const handleConfirmed = useCallback((_, data) => {
    onChange?.(toggleRccpPlanningDateMode(modes, RCCP_PLANNING_DATE_CONFIRMED, data.checked));
  }, [modes, onChange]);

  return (
    <div className={frameStyles.frame}>
      <div className={mergeClasses(styles.group)} role="group" aria-label="Load date">
        <Checkbox
          className={styles.checkbox}
          checked={modes.requested}
          disabled={modes.requested && !both}
          title={modes.requested && !both ? LAST_MODE_HINT : undefined}
          onChange={handleRequested}
          label="Req."
          aria-label="Requested"
        />
        <Checkbox
          className={styles.checkbox}
          checked={modes.confirmed}
          disabled={modes.confirmed && !both}
          title={modes.confirmed && !both ? LAST_MODE_HINT : undefined}
          onChange={handleConfirmed}
          label={confirmedLabel}
          aria-label={confirmedAria}
        />
      </div>
    </div>
  );
}

export default memo(RccpLoadDateToggle);
