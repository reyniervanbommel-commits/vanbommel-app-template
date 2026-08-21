import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Customized, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { tokens } from '@fluentui/react-components';
import { PlanningBarShape, ReceiptBarShape } from './RccpDeliveryPlanShapes';
import RccpDeliveryPlanOverlay from './RccpDeliveryPlanOverlay';
import RccpDeliveryPlanTooltip from './RccpDeliveryPlanTooltip';

export default function RccpDeliveryPlanChart({
  model, selectedOrderId, onHover, onSelect,
}) {
  const layoutsRef = useRef({});
  const [layouts, setLayouts] = useState({});

  const handleLayout = useCallback((orderId, side, rect) => {
    const prev = layoutsRef.current[orderId] || {};
    layoutsRef.current[orderId] = { ...prev, [side]: rect };
  }, []);

  const commitLayouts = useCallback(() => {
    setLayouts({ ...layoutsRef.current });
  }, []);

  const planningShape = useCallback((props) => (
    <PlanningBarShape
      {...props}
      selectedOrderId={selectedOrderId}
      onHover={onHover}
      onSelect={onSelect}
      onLayout={handleLayout}
    />
  ), [handleLayout, onHover, onSelect, selectedOrderId]);

  const receiptShape = useCallback((props) => (
    <ReceiptBarShape
      {...props}
      selectedOrderId={selectedOrderId}
      onHover={onHover}
      onSelect={onSelect}
      onLayout={handleLayout}
    />
  ), [handleLayout, onHover, onSelect, selectedOrderId]);

  const overlay = useCallback((props) => (
    <RccpDeliveryPlanOverlay
      {...props}
      todayKey={model.todayKey}
      selectedOrderId={selectedOrderId}
      layouts={layouts}
      points={model.points}
    />
  ), [layouts, model.points, model.todayKey, selectedOrderId]);

  const tooltip = useCallback((props) => (
    <RccpDeliveryPlanTooltip
      {...props}
      ordersById={model.ordersById}
      selectedOrderId={selectedOrderId}
    />
  ), [model.ordersById, selectedOrderId]);

  const domain = useMemo(() => [-model.yMax, model.yMax], [model.yMax]);

  return (
    <div onMouseLeave={commitLayouts}>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={model.points}
          stackOffset="sign"
          onMouseMove={commitLayouts}
        >
          <CartesianGrid stroke={tokens.colorNeutralStroke2} vertical={false} />
          <XAxis dataKey="key" tick={{ fontSize: 11 }} />
          <YAxis domain={domain} tick={{ fontSize: 11 }} />
          <Customized component={overlay} />
          <Bar dataKey="planningTotal" shape={planningShape} isAnimationActive={false} />
          <Bar dataKey="receiptPlot" shape={receiptShape} isAnimationActive={false} />
          <Tooltip content={tooltip} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
