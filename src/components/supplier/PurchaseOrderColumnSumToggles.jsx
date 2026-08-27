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

export function withSumToggleHandlers(sumToggles, sumFlags, onToggleGroupSummary, onToggleColumnSum) {
  return {
    ...EMPTY_SUM_TOGGLES,
    ...sumToggles,
    ...sumFlags,
    onToggleGroupSummary,
    onToggleColumnSum,
  };
}

function PurchaseOrderColumnSumToggles({ styles, sumToggles }) {
  const handleGroupSummary = useCallback((_, data) => {
    if (data.checked === Boolean(sumToggles.isGroupSummaryColumn)) return;
    sumToggles.onToggleGroupSummary?.();
  }, [sumToggles]);

  const handleColumnSum = useCallback((_, data) => {
    if (data.checked === Boolean(sumToggles.isColumnSumColumn)) return;
    sumToggles.onToggleColumnSum?.();
  }, [sumToggles]);

  if (!sumToggles?.canToggleGroupSummary && !sumToggles?.canToggleColumnSum) return null;

  return (
    <>
      {sumToggles?.canToggleGroupSummary ? (
        <div className={styles.groupingToggleRow}>
          <Text size={200}>Show sum in group header</Text>
          <Switch
            checked={Boolean(sumToggles.isGroupSummaryColumn)}
            onChange={handleGroupSummary}
            aria-label="Show sum in group header"
          />
        </div>
      ) : null}
      {sumToggles?.canToggleColumnSum ? (
        <div className={styles.groupingToggleRow}>
          <Text size={200}>Show sum</Text>
          <Switch
            checked={Boolean(sumToggles.isColumnSumColumn)}
            onChange={handleColumnSum}
            aria-label="Show sum"
          />
        </div>
      ) : null}
    </>
  );
}

export default memo(PurchaseOrderColumnSumToggles);
