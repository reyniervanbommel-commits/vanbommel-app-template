import { poTableZoomedPx } from '../../utils/poTableZoom';
import { purchaseOrderBoardControlColumnWidth } from './purchaseOrderBoardLayout';
import { DEFAULT_HEADER_COLUMN_WIDTH } from './purchaseOrderColumnWidthUtils';

function colWidth(columnKey, columnWidths) {
  const stored = Number(columnWidths?.[columnKey]);
  const width = Number.isFinite(stored) ? stored : DEFAULT_HEADER_COLUMN_WIDTH;
  return poTableZoomedPx(width);
}

export default function PurchaseOrdersBoardColGroup({ columns = [], columnWidths = {} }) {
  return (
    <colgroup>
      <col style={{ width: purchaseOrderBoardControlColumnWidth }} />
      {columns.map((column) => {
        const width = colWidth(column.key, columnWidths);
        return <col key={column.key} style={{ width }} />;
      })}
    </colgroup>
  );
}
