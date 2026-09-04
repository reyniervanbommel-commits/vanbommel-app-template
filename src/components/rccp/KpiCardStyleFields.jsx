import React, { useCallback } from 'react';
import { Field, Radio, RadioGroup, makeStyles, shorthands } from '@fluentui/react-components';
import ColorPalettePicker from '../shared/ColorPalettePicker';
import { KPI_COLOR_TARGET_OTHER, KPI_COLOR_TARGET_VALUE } from '../../utils/kpiCardStyles';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
});

/**
 * Card settings for one KPI's pie: pick a color, choose which of the 2
 * slices (this value vs. the other value) gets it. The other slice stays gray.
 */
function KpiCardStyleFields({ style, onChange }) {
  const styles = useStyles();
  const handleColor = useCallback((color) => {
    onChange({ color });
  }, [onChange]);
  const handleColorTarget = useCallback((_, data) => {
    onChange({ colorTarget: data.value });
  }, [onChange]);
  return (
    <div className={styles.root} data-kpi-card-style-fields="">
      <Field label="Color">
        <ColorPalettePicker
          layout="compact"
          selectedColor={style.color || ''}
          onSelect={handleColor}
          ariaLabel="KPI card color"
        />
      </Field>
      <Field label="Applies to">
        <RadioGroup
          layout="horizontal"
          value={style.colorTarget || KPI_COLOR_TARGET_VALUE}
          onChange={handleColorTarget}
          aria-label="Which value gets the color"
        >
          <Radio value={KPI_COLOR_TARGET_VALUE} label="This value" />
          <Radio value={KPI_COLOR_TARGET_OTHER} label="Other value" />
        </RadioGroup>
      </Field>
    </div>
  );
}

export default KpiCardStyleFields;
