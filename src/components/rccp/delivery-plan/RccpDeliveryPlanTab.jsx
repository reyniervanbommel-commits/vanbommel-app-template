import React, { useCallback, useMemo, useState } from 'react';
import { Spinner, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { measureSync } from '../../../utils/perf';
import { buildChartModel, formatDetailLine } from './rccpDeliveryPlanModel';
import RccpDeliveryPlanChart from './RccpDeliveryPlanChart';
import RccpDeliveryPlanLegend from './RccpDeliveryPlanLegend';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalL) },
  hint: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
  detail: { color: tokens.colorNeutralForeground1 },
});

export default function RccpDeliveryPlanTab({
  hasVendor, data, loading, error,
}) {
  const styles = useStyles();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const model = useMemo(() => {
    if (!data) return null;
    return measureSync('rccp-delivery-plan-group', () => buildChartModel(
      data.orders,
      data.weeks,
      data.weeklyCapacity,
    ));
  }, [data]);

  const handleHover = useCallback((orderId) => setSelectedOrderId(orderId), []);
  const handleSelect = useCallback((orderId) => setSelectedOrderId(orderId), []);

  const selectedOrder = selectedOrderId && model
    ? model.ordersById.get(selectedOrderId)
    : null;

  if (!hasVendor) return null;
  if (loading) return <Spinner label="Loading delivery plan..." />;
  if (error) return <Text className={styles.error}>{error}</Text>;
  if (!model || !Array.isArray(data?.orders) || !data.orders.length) {
    return <Text className={styles.hint}>No purchase order lines in this week range.</Text>;
  }

  return (
    <div className={styles.root}>
      <RccpDeliveryPlanLegend />
      <RccpDeliveryPlanChart
        model={model}
        selectedOrderId={selectedOrderId}
        onHover={handleHover}
        onSelect={handleSelect}
      />
      <Text className={styles.detail}>
        {selectedOrder ? formatDetailLine(selectedOrder) : 'Hover a segment to see order details.'}
      </Text>
    </div>
  );
}
