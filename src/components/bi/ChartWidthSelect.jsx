import React, { memo, useCallback } from 'react';
import { Dropdown, Option, makeStyles, shorthands } from '@fluentui/react-components';
import { CHART_WIDTH_OPTIONS } from './biConstants';

const useStyles = makeStyles({
  root: { minWidth: '120px' },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

function ChartWidthSelect({ gridSpan = 1, disabled = false, onChange, size = 'small' }) {
  const styles = useStyles();
  const value = [1, 2, 3].includes(Number(gridSpan)) ? Number(gridSpan) : 1;

  const handleSelect = useCallback((_, data) => {
    onChange(Number(data.optionValue) || 1);
  }, [onChange]);

  return (
    <Dropdown
      className={styles.root}
      size={size}
      disabled={disabled}
      selectedOptions={[String(value)]}
      value={findLabel(CHART_WIDTH_OPTIONS, value)}
      onOptionSelect={handleSelect}
      aria-label="Chart width"
    >
      {CHART_WIDTH_OPTIONS.map((option) => (
        <Option key={option.key} value={String(option.key)} text={option.label}>{option.label}</Option>
      ))}
    </Dropdown>
  );
}

export default memo(ChartWidthSelect);
