import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderProductImagePreviewDialog from './PurchaseOrderProductImagePreviewDialog';
import {
  PRODUCT_IMAGE_CELL_HEIGHT,
  PRODUCT_IMAGE_HOVER_MAX_SIZE,
  PRODUCT_IMAGE_LOAD_DELAY_MS,
} from '../../utils/purchaseOrderProductImageColumn';
import { hasFailedProductImage, markProductImageFailed } from '../../utils/productImageFailureCache';

const useStyles = makeStyles({
  root: {
    display: 'block',
    position: 'relative',
    width: '100%',
    height: `${PRODUCT_IMAGE_CELL_HEIGHT}px`,
    maxHeight: `${PRODUCT_IMAGE_CELL_HEIGHT}px`,
    overflow: 'hidden',
  },
  imageButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: `${PRODUCT_IMAGE_CELL_HEIGHT}px`,
    maxHeight: `${PRODUCT_IMAGE_CELL_HEIGHT}px`,
    ...shorthands.padding(0),
    ...shorthands.border('none'),
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
  },
  imageButtonFormatted: {
    backgroundColor: 'transparent',
  },
  image: {
    display: 'block',
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: `${PRODUCT_IMAGE_CELL_HEIGHT}px`,
    objectFit: 'contain',
  },
  // Kept invisible (but still laid out) until `onLoad` fires, so a failing image
  // never briefly shows the browser's native broken-image icon + alt text.
  imagePending: {
    visibility: 'hidden',
  },
  hoverPreviewFrame: {
    position: 'fixed',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: `${PRODUCT_IMAGE_HOVER_MAX_SIZE}px`,
    maxHeight: `${PRODUCT_IMAGE_HOVER_MAX_SIZE}px`,
    ...shorthands.padding('4px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    pointerEvents: 'none',
  },
  hoverPreviewImage: {
    display: 'block',
    maxWidth: `${PRODUCT_IMAGE_HOVER_MAX_SIZE}px`,
    maxHeight: `${PRODUCT_IMAGE_HOVER_MAX_SIZE}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
  },
  badgeButton: {
    position: 'absolute',
    right: '2px',
    bottom: '2px',
    zIndex: 1,
    ...shorthands.padding(0),
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  badgeOverlay: {
    position: 'absolute',
    right: '2px',
    bottom: '2px',
    zIndex: 1,
    pointerEvents: 'none',
  },
});

function PurchaseOrderProductImageCell({
  dataAreaId,
  itemNumber,
  additionalItemCount = 0,
  isConditionalFormat = false,
}) {
  const styles = useStyles();
  const normalizedItemNumber = String(itemNumber || '').trim();
  const imageUrl = useMemo(() => {
    if (!dataAreaId || !normalizedItemNumber) return '';
    const query = new URLSearchParams({
      dataAreaId: String(dataAreaId),
      itemNumber: normalizedItemNumber,
    });
    return `/api/media/product-image?${query.toString()}`;
  }, [dataAreaId, normalizedItemNumber]);
  // Rows remount on every scroll into view (board virtualization). Start from the
  // failure cache so an already-known-broken image doesn't retry the fetch each time.
  const [imageAvailable, setImageAvailable] = useState(() => !hasFailedProductImage(imageUrl));
  // Only mount the actual <img src=...> once the row has stayed in view for a
  // moment — a fast scroll flick unmounts the row again before this fires, so no
  // request is ever made for rows you scroll straight past.
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  // Kept false until the browser confirms the image loaded, so we can hide the
  // <img> (via imagePending) for as long as we don't know it's actually good.
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Hover-preview via portal i.p.v. Fluent Tooltip: die Tooltip in een lijst
  // pre-rendert witte portals, en mounten-na-hover remount de trigger (mouseleave).
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState(null);

  useEffect(() => {
    setDialogOpen(false);
    setImageLoaded(false);
    setShouldLoadImage(false);
    setHoverPreviewPosition(null);
    if (hasFailedProductImage(imageUrl)) {
      setImageAvailable(false);
      return undefined;
    }
    setImageAvailable(true);
    const timer = setTimeout(() => setShouldLoadImage(true), PRODUCT_IMAGE_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [imageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    markProductImageFailed(imageUrl);
    setImageAvailable(false);
  }, [imageUrl]);

  const handleOpenDialog = useCallback(() => {
    if (imageUrl && imageAvailable) setDialogOpen(true);
  }, [imageAvailable, imageUrl]);

  const handleDialogOpenChange = useCallback((open) => {
    setDialogOpen(open);
  }, []);

  // Hover-preview pas na settle-delay, zonder de thumbnail-knop te remounten.
  const triggerRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const handleMouseEnter = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHoverPreviewPosition({
        top: Math.max(8, rect.top - PRODUCT_IMAGE_HOVER_MAX_SIZE - 8),
        left: Math.max(8, rect.left + (rect.width / 2) - (PRODUCT_IMAGE_HOVER_MAX_SIZE / 2)),
      });
    }, PRODUCT_IMAGE_LOAD_DELAY_MS);
  }, []);
  const handleMouseLeave = useCallback(() => {
    clearTimeout(tooltipTimerRef.current);
    setHoverPreviewPosition(null);
  }, []);
  useEffect(() => () => clearTimeout(tooltipTimerRef.current), []);

  const imageButtonClassName = mergeClasses(
    styles.imageButton,
    isConditionalFormat ? styles.imageButtonFormatted : undefined,
  );

  if (!imageUrl) return null;

  const badgeLabel = `${additionalItemCount} additional unique items`;

  return (
    <>
      <span className={styles.root}>
        {imageAvailable ? (
          <button
            ref={triggerRef}
            type="button"
            className={imageButtonClassName}
            onClick={handleOpenDialog}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label={`Show product image for ${normalizedItemNumber}`}
          >
            {shouldLoadImage ? (
              <img
                className={mergeClasses(styles.image, imageLoaded ? undefined : styles.imagePending)}
                src={imageUrl}
                alt={`Product image for ${normalizedItemNumber}`}
                loading="lazy"
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : null}
          </button>
        ) : null}
        {additionalItemCount > 0 ? (
          imageAvailable ? (
            <button
              type="button"
              className={styles.badgeButton}
              onClick={handleOpenDialog}
              aria-label={`Show product image for ${normalizedItemNumber} and ${badgeLabel}`}
            >
              <Badge appearance="tint" color="informative" size="small">+{additionalItemCount}</Badge>
            </button>
          ) : (
            <Badge
              className={styles.badgeOverlay}
              appearance="tint"
              color="informative"
              size="small"
              aria-label={badgeLabel}
            >
              +{additionalItemCount}
            </Badge>
          )
        ) : null}
      </span>
      {hoverPreviewPosition && imageAvailable ? createPortal(
        <div
          className={styles.hoverPreviewFrame}
          style={{ top: hoverPreviewPosition.top, left: hoverPreviewPosition.left }}
        >
          <img
            className={styles.hoverPreviewImage}
            src={imageUrl}
            alt=""
            draggable={false}
          />
        </div>,
        document.body,
      ) : null}
      <PurchaseOrderProductImagePreviewDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        imageUrl={imageUrl}
        itemNumber={normalizedItemNumber}
      />
    </>
  );
}

export default memo(PurchaseOrderProductImageCell);
