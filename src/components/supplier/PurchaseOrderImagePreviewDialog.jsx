import React, { useCallback } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  image: {
    width: '100%',
    maxHeight: '420px',
    objectFit: 'contain',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  block: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding('10px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '6px',
  },
});

function formatPlainValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee';
  return String(value);
}

export default function PurchaseOrderImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  column,
  order,
}) {
  const styles = useStyles();
  const sourceRawValue = String(order?.values?.[column?.options?.sourceColumnKey] || '');
  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(data.open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{column?.label || 'Plaatje'} - order {order?.orderNumber || '-'}</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <img className={styles.image} src={imageUrl} alt={`${column?.label || 'Plaatje'} groot voorbeeld`} />

            <div className={styles.block}>
              <div className={styles.title}>Broninformatie</div>
              <div>Originele waarde: {formatPlainValue(sourceRawValue)}</div>
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
