import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderProductImagePreviewDialog from './PurchaseOrderProductImagePreviewDialog';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('4px'),
  },
  imageButton: {
    display: 'block',
    width: '28px',
    height: '28px',
    ...shorthands.padding(0),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    cursor: 'zoom-in',
  },
  image: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  badgeButton: {
    ...shorthands.padding(0),
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'zoom-in',
  },
});

function PurchaseOrderProductImageCell({ dataAreaId, itemNumber, additionalItemCount = 0 }) {
  const styles = useStyles();
  const [imageAvailable, setImageAvailable] = useState(true);
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

  useEffect(() => {
    setImageAvailable(true);
    setDialogOpen(false);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    setImageAvailable(false);
  }, []);

  const handleOpenDialog = useCallback(() => {
    if (imageUrl && imageAvailable) setDialogOpen(true);
  }, [imageAvailable, imageUrl]);

  const handleDialogOpenChange = useCallback((open) => {
    setDialogOpen(open);
  }, []);

  if (!imageUrl) return null;

  const badgeLabel = `${additionalItemCount} additional unique items`;
  return (
    <>
      <span className={styles.root}>
        {imageAvailable ? (
          <button
            type="button"
            className={styles.imageButton}
            onClick={handleOpenDialog}
            aria-label={`Show product image for ${normalizedItemNumber}`}
          >
            <img
              className={styles.image}
              src={imageUrl}
              alt={`Product image for ${normalizedItemNumber}`}
              loading="lazy"
              draggable={false}
              onError={handleImageError}
            />
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
            <Badge appearance="tint" color="informative" size="small" aria-label={badgeLabel}>
              +{additionalItemCount}
            </Badge>
          )
        ) : null}
      </span>
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
