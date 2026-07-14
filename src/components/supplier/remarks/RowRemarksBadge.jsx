import React, { memo, useCallback } from 'react';
import { tokens } from '@fluentui/react-components';
import { Chat16Regular } from '@fluentui/react-icons';

function RowRemarksBadge({ count = 0, onOpen, orderNumber = '' }) {
  const safeCount = Math.max(0, Number(count) || 0);
  const hasMessages = safeCount > 0;
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
      <span className="remarks-badge-icon-wrap" aria-hidden="true">
        <Chat16Regular
          style={{
            color: hasMessages ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground3,
          }}
        />
        {safeCount > 0 ? <span className="remarks-badge-count">{safeCount}</span> : null}
      </span>
    </button>
  );
}

export default memo(RowRemarksBadge);
