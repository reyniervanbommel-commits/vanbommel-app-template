import React, { memo, useCallback } from 'react';
import { Button, Input, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  colorInput: {
    width: '44px',
    minWidth: '44px',
    ...shorthands.padding('0'),
    border: 'none',
    backgroundColor: 'transparent',
  },
});

function PurchaseOrderColumnGroupingSection({
  column,
  isGroupingColumn,
  groupingColor,
  onSetGroupingColumn,
  onClearGrouping,
  onSetGroupingColor,
}) {
  const styles = useStyles();

  const handleEnable = useCallback(() => {
    onSetGroupingColumn(column.key);
  }, [column.key, onSetGroupingColumn]);

  const handleDisable = useCallback(() => {
    onClearGrouping();
  }, [onClearGrouping]);

  const handleColorChange = useCallback((event) => {
    onSetGroupingColor(event.target.value);
  }, [onSetGroupingColor]);

  return (
    <div className={styles.section}>
      <Text className={styles.title}>Category bar</Text>
      {isGroupingColumn ? (
        <Button size="small" appearance="subtle" onClick={handleDisable}>
          Clear category grouping
        </Button>
      ) : (
        <Button size="small" appearance="subtle" onClick={handleEnable}>
          Group by this column
        </Button>
      )}
      <div className={styles.colorRow}>
        <Text size={200}>Bar color</Text>
        <Input
          type="color"
          className={styles.colorInput}
          value={groupingColor}
          onChange={handleColorChange}
          aria-label="Category bar color"
        />
      </div>
    </div>
  );
}

export default memo(PurchaseOrderColumnGroupingSection);
