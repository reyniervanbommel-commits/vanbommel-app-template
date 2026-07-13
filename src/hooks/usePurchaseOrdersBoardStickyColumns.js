import { useRef } from 'react';
import useAxisLockedScroll from './useAxisLockedScroll';
import { useSequentialStickyColumns } from './useSequentialStickyColumns';

/**
 * Koppelt de horizontale board-scrollcontainer aan serialiseerbare sticky kolommen.
 */
export function usePurchaseOrdersBoardStickyColumns({
  columns,
  headerColumnWidths,
  stickyColumnKeys,
  onStickyColumnKeysChange,
}) {
  const wrapperRef = useRef(null);
  useAxisLockedScroll(wrapperRef);
  const stickyColumns = useSequentialStickyColumns({
    columns,
    headerColumnWidths,
    wrapperRef,
    stickyColumnKeys,
    onStickyColumnKeysChange,
  });

  return { wrapperRef, ...stickyColumns };
}
