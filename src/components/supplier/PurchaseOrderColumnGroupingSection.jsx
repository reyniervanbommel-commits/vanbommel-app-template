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
  canToggleGroupSummary = false,
  isGroupSummaryColumn = false,
  onToggleGroupSummary,
}) {
  const styles = useStyles();

  const handleEnable = useCallback(() => {
    onSetGroupingColumn(column.key);
  }, [column.key, onSetGroupingColumn]);

  const handleDisable = useCallback(() => {
    onClearGrouping(column.key);
  }, [column.key, onClearGrouping]);

  const handleClearAll = useCallback(() => {
    onClearGrouping();
  }, [onClearGrouping]);

  const handleColorChange = useCallback((event) => {
    onSetGroupingColor(column.key, event.target.value);
  }, [column.key, onSetGroupingColor]);

  return (
    <div className={styles.section}>
      <Text className={styles.title}>Category bar</Text>
      {isGroupingColumn ? (
        <>
          <Button size="small" appearance="subtle" onClick={handleDisable}>
            Remove grouping from this column
          </Button>
          <Button size="small" appearance="subtle" onClick={handleClearAll}>
            Clear all category grouping
          </Button>
        </>
      ) : (
        <Button size="small" appearance="subtle" onClick={handleEnable}>
          Add grouping by this column
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
      {canToggleGroupSummary ? (
        <Button size="small" appearance="subtle" onClick={onToggleGroupSummary}>
          {isGroupSummaryColumn ? 'Hide sum in group header' : 'Show sum in group header'}
        </Button>
      ) : null}
    </div>
  );
}

export default memo(PurchaseOrderColumnGroupingSection);
