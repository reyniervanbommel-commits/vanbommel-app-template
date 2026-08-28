import { RCCP_PO_BAR_SIZE } from './rccpPoStack';

function isAboveOpen(segment) {
  return segment.status === 'open' || segment.status === 'confirmed';
}

/**
 * When Planning date is Confirmed, the above-axis stack is the confirmed-week
 * segments (same open+received encoding). Requested keeps segmentsAbove.
 */
export function applyPlanningDateAbove(chart, planningDate) {
  if (planningDate !== 'confirmed') return chart || [];
  return (chart || []).map((point) => ({
    ...point,
    segmentsAbove: (point.segmentsConfirmed || []).map((segment) => (
      segment.status === 'confirmed' ? { ...segment, status: 'open' } : segment
    )),
  }));
}

/**
 * Map analysis chart points to plot rows: visibility-filtered stacks.
 * @param {{ chart: object[], openVisible: boolean, deliveredVisible: boolean, openColor: string, receivedColor: string }} args
 */
export function buildRccpChartRows({
  chart, openVisible, deliveredVisible, openColor, receivedColor,
}) {
  return (chart || []).map((point) => {
    const segmentsAbove = (point.segmentsAbove || []).filter((seg) => (
      (isAboveOpen(seg) && openVisible) || (seg.status === 'received' && deliveredVisible)
    ));
    const segmentsBelow = deliveredVisible ? (point.segmentsBelow || []) : [];
    return {
      ...point,
      segmentsAbove,
      segmentsBelow,
      __stackAbove: segmentsAbove.reduce((sum, seg) => sum + seg.qty, 0),
      __stackBelow: -segmentsBelow.reduce((sum, seg) => sum + seg.qty, 0),
      __openColor: openColor,
      __receivedColor: receivedColor,
      __barWidthAbove: RCCP_PO_BAR_SIZE,
      __barWidthBelow: RCCP_PO_BAR_SIZE,
    };
  });
}
