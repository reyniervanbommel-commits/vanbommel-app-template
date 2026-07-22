import React, { memo, useCallback, useMemo, useState } from 'react';
import { Badge, Tooltip, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderProductImagePreviewDialog from './PurchaseOrderProductImagePreviewDialog';
import { useProductImage } from '../../hooks/useProductImage';
import {
  PRODUCT_IMAGE_CELL_HEIGHT,
  PRODUCT_IMAGE_HOVER_MAX_SIZE,
} from '../../utils/purchaseOrderProductImageColumn';

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
  hoverPreviewFrame: {
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const normalizedItemNumber = String(itemNumber || '').trim();
  const imageUrl = useMemo(() => {
    if (!dataAreaId || !normalizedItemNumber) return '';
    const query = new URLSearchParams({
      dataAreaId: String(dataAreaId),
      itemNumber: normalizedItemNumber,
    });
    return `/api/media/product-image?${query.toString()}`;
  }, [dataAreaId, normalizedItemNumber]);

  // Gedeelde loader: dedupliceert per item, limiteert concurrency en retryt op 429.
  // Thumbnail én tooltip-preview delen dezelfde geladen afbeelding (1 request per item).
  const { status, src } = useProductImage(imageUrl);
  const imageAvailable = status === 'loaded' && !!src;

  const handleOpenDialog = useCallback(() => {
    if (imageAvailable) setDialogOpen(true);
  }, [imageAvailable]);

  const handleDialogOpenChange = useCallback((open) => {
    setDialogOpen(open);
  }, []);

  const imageButtonClassName = mergeClasses(
    styles.imageButton,
    isConditionalFormat ? styles.imageButtonFormatted : undefined,
  );

  if (!imageUrl) return null;

  const badgeLabel = `${additionalItemCount} additional unique items`;
  const hoverPreview = (
    <div className={styles.hoverPreviewFrame}>
      <img
        className={styles.hoverPreviewImage}
        src={src}
        alt=""
        draggable={false}
      />
    </div>
  );

  return (
    <>
      <span className={styles.root}>
        {imageAvailable ? (
          <Tooltip content={hoverPreview} relationship="description" positioning="above">
            <button
              type="button"
              className={imageButtonClassName}
              onClick={handleOpenDialog}
              aria-label={`Show product image for ${normalizedItemNumber}`}
            >
              <img
                className={styles.image}
                src={src}
                alt={`Product image for ${normalizedItemNumber}`}
                draggable={false}
              />
            </button>
          </Tooltip>
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
      <PurchaseOrderProductImagePreviewDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        imageUrl={src}
        itemNumber={normalizedItemNumber}
      />
    </>
  );
}

export default memo(PurchaseOrderProductImageCell);
