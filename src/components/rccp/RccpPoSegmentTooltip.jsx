import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { makeStyles, shorthands } from '@fluentui/react-components';

const HOVER_IMAGE_MAX_PX = 160;

const useStyles = makeStyles({
  box: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#d1d1d1'),
    ...shorthands.padding('8px', '12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    fontSize: '12px',
    color: '#323130',
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
    maxWidth: '220px',
  },
  late: { color: '#D13438' },
  image: {
    display: 'block',
    maxWidth: `${HOVER_IMAGE_MAX_PX}px`,
    maxHeight: `${HOVER_IMAGE_MAX_PX}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    backgroundColor: '#f3f2f1',
  },
});

export function isSameRccpHover(prev, next) {
  if (!prev || !next) return false;
  return prev.segment?.itemNumber === next.segment?.itemNumber
    && prev.segment?.status === next.segment?.status
    && prev.label === next.label;
}

export function firstChartDataAreaId(chart) {
  for (const point of chart || []) {
    const segs = [...(point.segmentsAbove || []), ...(point.segmentsBelow || [])];
    for (const seg of segs) {
      const id = String(seg?.dataAreaId || '').trim();
      if (id) return id;
    }
  }
  return '';
}

function productImageUrl(dataAreaId, itemNumber) {
  const company = String(dataAreaId || '').trim();
  const sku = String(itemNumber || '').trim();
  if (!company || !sku) return '';
  return `/api/media/product-image?${new URLSearchParams({
    dataAreaId: company,
    itemNumber: sku,
  }).toString()}`;
}

function RccpItemHoverImage({ dataAreaId, itemNumber }) {
  const styles = useStyles();
  const url = useMemo(() => productImageUrl(dataAreaId, itemNumber), [dataAreaId, itemNumber]);
  const [failed, setFailed] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    setFailed(false);
    return () => {
      aliveRef.current = false;
    };
  }, [url]);

  const handleError = useCallback(() => {
    if (!aliveRef.current) return;
    setFailed(true);
  }, []);

  if (!url || failed) return null;
  return (
    <img
      className={styles.image}
      src={url}
      alt={`Product image for ${itemNumber}`}
      draggable={false}
      onError={handleError}
      style={{
        display: 'block',
        maxWidth: `${HOVER_IMAGE_MAX_PX}px`,
        maxHeight: `${HOVER_IMAGE_MAX_PX}px`,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        backgroundColor: '#f3f2f1',
      }}
    />
  );
}

function RccpPoSegmentTooltip({ active, label, segment, fallbackDataAreaId = '' }) {
  const styles = useStyles();
  if (!active || !segment) return null;
  const status = segment.status === 'open' ? 'Open' : 'Received';
  const dataAreaId = String(segment.dataAreaId || fallbackDataAreaId || '').trim();
  return (
    <div className={styles.box} role="tooltip">
      <RccpItemHoverImage dataAreaId={dataAreaId} itemNumber={segment.itemNumber} />
      <div>{`Item: ${segment.itemNumber || '—'}`}</div>
      <div>{`Status: ${status}`}</div>
      <div>{`Quantity: ${segment.qty}`}</div>
      <div>{`Week: ${label || ''}`}</div>
      {segment.late ? <div className={styles.late}>Late</div> : null}
    </div>
  );
}

export function RccpPoSegmentHoverCard({ hover, boxRef, fallbackDataAreaId }) {
  if (!hover?.segment || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: hover.x + 12,
        top: hover.y + 12,
        zIndex: 2000000,
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
      }}
    >
      <RccpPoSegmentTooltip
        active
        segment={hover.segment}
        label={hover.label}
        fallbackDataAreaId={fallbackDataAreaId}
      />
    </div>,
    document.body,
  );
}

export default memo(RccpPoSegmentTooltip);
