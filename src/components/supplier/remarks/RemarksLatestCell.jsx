import React, { memo, useCallback } from 'react';
import { formatDateTime } from './remarksFormatters';

function RemarksLatestCell({ summary, onOpen, orderNumber = '' }) {
  const latest = summary?.latest || null;
  const preview = latest?.bodyPreview || latest?.body || 'No remarks';
  const authorName = latest?.authorName || latest?.author?.displayName || 'Unknown user';
  const title = latest
    ? `${preview} · ${authorName} · ${formatDateTime(latest.createdAt)}`
    : preview;

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
      title={title}
      onClick={handleOpen}
    >
      <div className="remarks-latest-preview">{preview}</div>
    </button>
  );
}

export default memo(RemarksLatestCell);
