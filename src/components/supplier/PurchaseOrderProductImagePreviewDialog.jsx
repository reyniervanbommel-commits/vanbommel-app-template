import React, { useCallback } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    overflowX: 'hidden',
    overflowY: 'hidden',
    maxWidth: '100%',
  },
  imageFrame: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
  },
  image: {
    display: 'block',
    maxWidth: '100%',
    width: 'auto',
    height: 'auto',
    maxHeight: '420px',
    objectFit: 'contain',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  itemNumber: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
});

export default function PurchaseOrderProductImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  itemNumber,
}) {
  const styles = useStyles();
  const normalizedItemNumber = String(itemNumber || '').trim();
  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(data.open);
  }, [onOpenChange]);

  if (!imageUrl || !normalizedItemNumber) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Product image</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <div className={styles.imageFrame}>
              <img
                className={styles.image}
                src={imageUrl}
                alt={`Product image for ${normalizedItemNumber}`}
              />
            </div>
            <Text className={styles.itemNumber}>{normalizedItemNumber}</Text>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
