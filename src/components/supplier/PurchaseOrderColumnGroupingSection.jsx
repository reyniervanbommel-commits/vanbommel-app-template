import React, { memo, useCallback, useMemo } from 'react';
import { Button, Field, Switch, Text } from '@fluentui/react-components';
import ColorPalettePicker, { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';
import { getRgbHex, isHexColor, normalizeHexColor } from '../../utils/hexColor';
import PurchaseOrderColumnSumToggles, { EMPTY_SUM_TOGGLES } from './PurchaseOrderColumnSumToggles';

function resolvePaletteColor(color) {
  const rgb = getRgbHex(color);
  const match = SELECTABLE_STATUS_COLORS.find((entry) => entry.toLowerCase() === rgb);
  if (!match) return SELECTABLE_STATUS_COLORS[0];
  return isHexColor(color) ? normalizeHexColor(color) : match;
}

function PurchaseOrderColumnGroupingSection({
  styles,
  column,
  isGroupingColumn,
  groupingColor,
  onSetGroupingColumn,
  onClearGrouping,
  onSetGroupingColor,
  sumToggles = EMPTY_SUM_TOGGLES,
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
        <PurchaseOrderColumnSumToggles
          styles={styles}
          sumToggles={sumToggles}
        />
      </div>
    </>
  );
}

export default memo(PurchaseOrderColumnGroupingSection);
