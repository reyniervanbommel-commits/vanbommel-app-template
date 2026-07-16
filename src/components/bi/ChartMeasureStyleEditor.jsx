import React, { memo } from 'react';
import { Field, makeStyles, Radio, RadioGroup, shorthands, Text, tokens } from '@fluentui/react-components';
import { MEASURE_STYLE_BAR, MEASURE_STYLE_LINE } from './biConstants';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '10px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  title: {
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
});

function ChartMeasureStyleEditor({ columns, selectedKeys, measureStyles, onMeasureStyleChange }) {
  const styles = useStyles();
  const columnByKey = new Map((columns || []).map((col) => [col.key, col]));

  if (!selectedKeys?.length) return null;

  return (
    <div className={styles.root}>
      <Text size={200} weight="semibold" className={styles.title}>Series display</Text>
      {selectedKeys.map((key) => {
        const label = columnByKey.get(key)?.label || key;
        const style = measureStyles?.[key] === MEASURE_STYLE_LINE ? MEASURE_STYLE_LINE : MEASURE_STYLE_BAR;
        return (
          <Field key={key} label={label} size="small">
            <RadioGroup
              layout="horizontal"
              value={style}
              onChange={(_, data) => onMeasureStyleChange(key, data.value)}
            >
              <Radio value={MEASURE_STYLE_BAR} label="Bar" />
              <Radio value={MEASURE_STYLE_LINE} label="Line" />
            </RadioGroup>
          </Field>
        );
      })}
    </div>
  );
}

export default memo(ChartMeasureStyleEditor);
