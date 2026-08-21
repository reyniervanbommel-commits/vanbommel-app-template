import React from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { buildTooltipRows } from './rccpDeliveryPlanModel';

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow8,
    minWidth: '180px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalM),
    fontSize: tokens.fontSizeBase200,
  },
  label: { color: tokens.colorNeutralForeground3 },
});

export default function RccpDeliveryPlanTooltip({
  active, payload, ordersById, selectedOrderId,
}) {
  const styles = useStyles();
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const hoverId = selectedOrderId || point?.planningSegments?.[0]?.orderId
    || point?.receiptSegments?.[0]?.orderId;
  const order = hoverId ? ordersById.get(hoverId) : null;
  if (!order) return null;
  return (
    <div className={styles.root}>
      {buildTooltipRows(order).map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
