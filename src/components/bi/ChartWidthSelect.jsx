import React, { memo, useCallback } from 'react';
import { Dropdown, Option, makeStyles, shorthands } from '@fluentui/react-components';
import { CHART_SIZE_MEDIUM, CHART_SIZE_OPTIONS_BAR_LINE } from './biConstants';

const useStyles = makeStyles({
  root: { minWidth: '120px' },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

function ChartWidthSelect({ chartSize = CHART_SIZE_MEDIUM, disabled = false, onChange, size = 'small' }) {
  const styles = useStyles();
  const value = chartSize === 'wide' ? 'wide' : CHART_SIZE_MEDIUM;

  const handleSelect = useCallback((_, data) => {
    onChange(data.optionValue === 'wide' ? 'wide' : CHART_SIZE_MEDIUM);
  }, [onChange]);

  return (
    <Dropdown
      className={styles.root}
      size={size}
      disabled={disabled}
      selectedOptions={[value]}
      value={findLabel(CHART_SIZE_OPTIONS_BAR_LINE, value)}
      onOptionSelect={handleSelect}
      aria-label="Chart size"
    >
      {CHART_SIZE_OPTIONS_BAR_LINE.map((option) => (
        <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
      ))}
    </Dropdown>
  );
}

export default memo(ChartWidthSelect);
