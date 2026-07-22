import React, { memo, useCallback } from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { DATE_PERIOD_DISPLAY_MODES, normalizeDatePeriodDisplayMode } from '../../utils/datePeriodColumnUtils';

const useStyles = makeStyles({
  subPaneTitle: {
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    marginBottom: '4px',
  },
  modeButton: {
    justifyContent: 'flex-start',
  },
  activeModeButton: {
    justifyContent: 'flex-start',
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
});

const ModeButton = memo(function ModeButton({ mode, label, active, onSelect }) {
  const styles = useStyles();
  const handleClick = useCallback(() => onSelect(mode), [mode, onSelect]);
  return (
    <Button
      className={active ? styles.activeModeButton : styles.modeButton}
      appearance="subtle"
      size="small"
      onClick={handleClick}
      aria-pressed={active}
    >
      {label}
    </Button>
  );
});

export default function PurchaseOrderDatePeriodDisplayPane({
  displayMode,
  onSelectDisplayMode,
}) {
  const styles = useStyles();
  const normalizedMode = normalizeDatePeriodDisplayMode(displayMode);

  return (
    <>
      <Text className={styles.subPaneTitle}>Display as</Text>
      <ModeButton
        mode={DATE_PERIOD_DISPLAY_MODES.week}
        label="Week number"
        active={normalizedMode === DATE_PERIOD_DISPLAY_MODES.week}
        onSelect={onSelectDisplayMode}
      />
      <ModeButton
        mode={DATE_PERIOD_DISPLAY_MODES.month}
        label="Month name"
        active={normalizedMode === DATE_PERIOD_DISPLAY_MODES.month}
        onSelect={onSelectDisplayMode}
      />
    </>
  );
}
