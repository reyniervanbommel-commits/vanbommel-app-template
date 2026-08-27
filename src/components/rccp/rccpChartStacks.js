import { RCCP_PO_BAR_SIZE } from './rccpPoStack';

/**
 * Map analysis chart points to plot rows: visibility-filtered stacks plus reserved confirmed slots.
 * @param {{ chart: object[], openVisible: boolean, deliveredVisible: boolean, openColor: string, receivedColor: string }} args
 */
export function buildRccpChartRows({
  chart, openVisible, deliveredVisible, openColor, receivedColor,
}) {
  return (chart || []).map((point) => {
    const segmentsAbove = (point.segmentsAbove || []).filter((seg) => (
      (seg.status === 'open' && openVisible) || (seg.status === 'received' && deliveredVisible)
    ));
    const segmentsBelow = deliveredVisible ? (point.segmentsBelow || []) : [];
    const segmentsConfirmed = point.segmentsConfirmed || [];
    return {
      ...point,
      segmentsAbove,
      segmentsBelow,
      segmentsConfirmed,
      __stackAbove: segmentsAbove.reduce((sum, seg) => sum + seg.qty, 0),
      __stackBelow: -segmentsBelow.reduce((sum, seg) => sum + seg.qty, 0),
      __stackConfirmed: segmentsConfirmed.reduce((sum, seg) => sum + seg.qty, 0),
      __openColor: openColor,
      __receivedColor: receivedColor,
      __barWidthAbove: RCCP_PO_BAR_SIZE,
      __barWidthBelow: RCCP_PO_BAR_SIZE,
      __barWidthConfirmed: RCCP_PO_BAR_SIZE,
    };
  });
}
