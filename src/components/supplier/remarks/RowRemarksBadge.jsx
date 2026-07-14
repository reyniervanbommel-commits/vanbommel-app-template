import React, { memo, useCallback } from 'react';

function RowRemarksBadge({ count = 0, onOpen, orderNumber = '' }) {
  const safeCount = Math.max(0, Number(count) || 0);
  const label =
    safeCount === 1
      ? `Open 1 remark for purchase order ${orderNumber}`
      : `Open ${safeCount} remarks for purchase order ${orderNumber}`;

  const handleOpen = useCallback(
    (event) => {
      onOpen?.(event.currentTarget);
    },
    [onOpen]
  );

  return (
    <button type="button" className="remarks-badge-button" aria-label={label} title={label} onClick={handleOpen}>
      <span aria-hidden="true">💬</span>
      {safeCount > 0 ? <span className="remarks-badge-count">{safeCount}</span> : null}
    </button>
  );
}

export default memo(RowRemarksBadge);
