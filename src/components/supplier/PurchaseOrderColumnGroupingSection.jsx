import React, { memo, useCallback, useMemo } from 'react';
import { Button, Field, Switch, Text } from '@fluentui/react-components';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

function resolvePaletteColor(color) {
  const normalized = String(color || '').trim().toLowerCase();
  const match = SELECTABLE_STATUS_COLORS.find((entry) => entry.toLowerCase() === normalized);
  return match || SELECTABLE_STATUS_COLORS[0];
}

function PurchaseOrderColumnGroupingSection({
  styles,
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
  const paletteColor = useMemo(() => resolvePaletteColor(groupingColor), [groupingColor]);

  const handleGroupingToggle = useCallback((_, data) => {
    if (data.checked) {
      onSetGroupingColumn(column.key);
      return;
    }
    onClearGrouping(column.key);
  }, [column.key, onClearGrouping, onSetGroupingColumn]);

  const handleClearAll = useCallback(() => {
    onClearGrouping();
  }, [onClearGrouping]);

  const handleColorSelect = useCallback((color) => {
    onSetGroupingColor(column.key, color);
  }, [column.key, onSetGroupingColor]);

  const handleSummaryToggle = useCallback((_, data) => {
    if (data.checked === isGroupSummaryColumn) return;
    onToggleGroupSummary();
  }, [isGroupSummaryColumn, onToggleGroupSummary]);

  return (
    <>
      <Text className={styles.subPaneTitle}>Category / group</Text>
      <div className={styles.groupingSection}>
        <div className={styles.groupingToggleRow}>
          <Text size={200}>Group by this column</Text>
          <Switch
            checked={isGroupingColumn}
            onChange={handleGroupingToggle}
            aria-label="Group by this column"
          />
        </div>
        {isGroupingColumn ? (
          <Button size="small" appearance="subtle" onClick={handleClearAll}>
            Clear all category grouping
          </Button>
        ) : null}
        <Field label="Bar color" className={styles.groupingColorField}>
          <ColorPalettePicker
            layout="compact"
            selectedColor={paletteColor}
            onSelect={handleColorSelect}
            ariaLabel={`Category bar color for ${column.label}`}
          />
        </Field>
        {canToggleGroupSummary ? (
          <div className={styles.groupingToggleRow}>
            <Text size={200}>Show sum in group header</Text>
            <Switch
              checked={isGroupSummaryColumn}
              onChange={handleSummaryToggle}
              aria-label="Show sum in group header"
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default memo(PurchaseOrderColumnGroupingSection);
