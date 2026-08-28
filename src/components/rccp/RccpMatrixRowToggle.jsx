import React, { memo, useCallback } from 'react';
import { ToggleButton, makeStyles, mergeClasses, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  toggle: {
    maxWidth: '100%',
    minWidth: 0,
    justifyContent: 'flex-start',
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalSNudge),
  },
  nested: { marginLeft: tokens.spacingHorizontalS },
});

/**
 * Pressed label toggles a matrix row (chart series, or planning date).
 */
function RccpMatrixRowToggle({
  measureKey, label, checked, onToggle, planningDate = false, nested = false,
}) {
  const styles = useStyles();
  const handleClick = useCallback(() => {
    onToggle(measureKey, !checked);
  }, [measureKey, onToggle, checked]);
  return (
    <ToggleButton
      appearance="subtle"
      size="small"
      checked={Boolean(checked)}
      onClick={handleClick}
      className={mergeClasses(styles.toggle, nested && styles.nested)}
      aria-label={planningDate ? `Use ${label} as planning date` : `Show ${label} in chart`}
      title={label}
    >
      {label}
    </ToggleButton>
  );
}

export default memo(RccpMatrixRowToggle);
