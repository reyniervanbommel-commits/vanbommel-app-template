import React, { memo, useCallback } from 'react';
import { Switch, Text } from '@fluentui/react-components';

export const EMPTY_SUM_TOGGLES = {
  isGroupSummaryColumn: false,
  onSetGroupSummaryColumn: undefined,
  isColumnSumColumn: false,
  onSetColumnSumColumn: undefined,
};

export function buildColumnSumToggles(columnKey, groupSummaryColumnKeys, columnSums, setGroupSummaryColumn) {
  return {
    isGroupSummaryColumn: Array.isArray(groupSummaryColumnKeys) && groupSummaryColumnKeys.includes(columnKey),
    onSetGroupSummaryColumn: setGroupSummaryColumn,
    isColumnSumColumn: Boolean(columnSums?.columnSumKeys?.includes(columnKey)),
    onSetColumnSumColumn: columnSums?.setColumnSumColumn,
  };
}

export function withSumToggleHandlers(sumToggles, sumFlags, onToggleGroupSummary) {
  return {
    ...EMPTY_SUM_TOGGLES,
    ...sumToggles,
    ...sumFlags,
    onToggleGroupSummary,
  };
}

export function PurchaseOrderShowSumSwitch({ styles, checked, onToggle, onMouseEnter }) {
  const handleChange = useCallback((_, data) => {
    if (data.checked === Boolean(checked)) return;
    onToggle?.();
  }, [checked, onToggle]);

  return (
    <div className={styles.groupingToggleRow} onMouseEnter={onMouseEnter}>
      <Text size={300}>Show sum</Text>
      <Switch
        checked={Boolean(checked)}
        onChange={handleChange}
        aria-label="Show sum"
      />
    </div>
  );
}

function PurchaseOrderColumnSumToggles({ styles, sumToggles }) {
  const handleGroupSummary = useCallback((_, data) => {
    if (data.checked === Boolean(sumToggles.isGroupSummaryColumn)) return;
    sumToggles.onToggleGroupSummary?.();
  }, [sumToggles]);

  if (!sumToggles?.canToggleGroupSummary) return null;

  return (
    <div className={styles.groupingToggleRow}>
      <Text size={200}>Show sum in group header</Text>
      <Switch
        checked={Boolean(sumToggles.isGroupSummaryColumn)}
        onChange={handleGroupSummary}
        aria-label="Show sum in group header"
      />
    </div>
  );
}

export default memo(PurchaseOrderColumnSumToggles);
