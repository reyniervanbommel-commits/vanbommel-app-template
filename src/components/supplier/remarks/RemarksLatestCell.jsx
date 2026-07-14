import React, { memo, useCallback } from 'react';
import { formatDateTime } from './remarksFormatters';

function RemarksLatestCell({ summary, onOpen, orderNumber = '' }) {
  const latest = summary?.latest || null;
  const count = Number(summary?.count) || 0;
  const preview = latest?.bodyPreview || latest?.body || 'No remarks';
  const authorName = latest?.authorName || latest?.author?.displayName || 'Unknown user';

  const handleOpen = useCallback(
    (event) => {
      onOpen?.(event.currentTarget);
    },
    [onOpen]
  );

  return (
    <button
      type="button"
      className="remarks-latest-cell"
      aria-label={`Open remarks for purchase order ${orderNumber}`}
      onClick={handleOpen}
    >
      <div className="remarks-latest-preview" title={preview}>
        {preview}
      </div>
      {latest ? (
        <div className="remarks-meta">
          {authorName} · {formatDateTime(latest.createdAt)} · {count}
        </div>
      ) : null}
    </button>
  );
}

export default memo(RemarksLatestCell);
