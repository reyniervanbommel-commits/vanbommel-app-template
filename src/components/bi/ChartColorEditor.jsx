import React, { memo, useCallback } from 'react';
import { Dropdown, Field, makeStyles, Option, shorthands } from '@fluentui/react-components';
import ColorPalettePicker from '../shared/ColorPalettePicker';
import { COLOR_MODE_OPTIONS, COLOR_MODE_SINGLE, resolveSingleColor } from './biConstants';

const useStyles = makeStyles({
  swatches: {
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    ...shorthands.padding('4px', '0'),
  },
});

const findLabel = (options, key) => options.find((option) => String(option.key) === String(key))?.label || '';

function ChartColorEditor({
  colorMode,
  config,
  onColorModeChange,
  onSingleColorChange,
  embedded = false,
  controlSize = 'small',
}) {
  const styles = useStyles();
  const singleColor = resolveSingleColor(config || {});

  const handleModeSelect = useCallback((_, data) => {
    onColorModeChange(data.optionValue);
  }, [onColorModeChange]);

  return (
    <>
      <Field label="Color mode" size={embedded ? controlSize : undefined}>
        <Dropdown
          size={controlSize}
          selectedOptions={[colorMode]}
          value={findLabel(COLOR_MODE_OPTIONS, colorMode)}
          onOptionSelect={handleModeSelect}
        >
          {COLOR_MODE_OPTIONS.map((option) => (
            <Option key={option.key} value={option.key} text={option.label}>{option.label}</Option>
          ))}
        </Dropdown>
      </Field>
      {colorMode === COLOR_MODE_SINGLE ? (
        <Field label="Color" size={embedded ? controlSize : undefined}>
          <div className={styles.swatches}>
            <ColorPalettePicker
              layout="compact"
              selectedColor={singleColor}
              onSelect={onSingleColorChange}
              ariaLabel="Chart color"
            />
          </div>
        </Field>
      ) : null}
    </>
  );
}

export default memo(ChartColorEditor);
