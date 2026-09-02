import { poTableZoomedPx } from '../../utils/poTableZoom';

/** Fixed row heights for the purchase orders board (px). */
export const PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX = 32;
export const PURCHASE_ORDER_SUB_ROW_HEIGHT_PX = 30;
/** Sticky thead height — group headers stick directly below this offset. */
export const PURCHASE_ORDER_BOARD_HEADER_HEIGHT_PX = 41;
export const PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX = 116;

export const purchaseOrderBoardRowHeight = poTableZoomedPx(PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX);
export const purchaseOrderSubRowHeight = poTableZoomedPx(PURCHASE_ORDER_SUB_ROW_HEIGHT_PX);
export const purchaseOrderBoardHeaderHeight = poTableZoomedPx(PURCHASE_ORDER_BOARD_HEADER_HEIGHT_PX);
export const purchaseOrderBoardControlColumnWidth = poTableZoomedPx(PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX);
