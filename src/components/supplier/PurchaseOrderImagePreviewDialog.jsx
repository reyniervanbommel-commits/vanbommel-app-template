import React, { useCallback, useMemo } from 'react';
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
import { applyImageTransforms } from '../../utils/imageColumnUrl';

const MAX_LINKED_ROWS = 5;
const MAX_LINKED_FIELDS = 4;

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
  muted: {
    color: tokens.colorNeutralForeground3,
  },
  lineRow: {
    marginBottom: '6px',
  },
});

function formatPlainValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee';
  return String(value);
}

function getLinkedRowPreview(lines) {
  const safeLines = Array.isArray(lines) ? lines.slice(0, MAX_LINKED_ROWS) : [];
  return safeLines.map((line) => {
    const values = line?.values && typeof line.values === 'object' ? line.values : {};
    const keys = Object.keys(values).filter((key) => values[key] !== null && values[key] !== undefined && values[key] !== '').slice(0, MAX_LINKED_FIELDS);
    const fields = keys.map((key) => ({ key, value: formatPlainValue(values[key]) }));
    return {
      lineNumber: line?.lineNumber ?? '-',
      fields,
    };
  });
}

export default function PurchaseOrderImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  column,
  order,
}) {
  const styles = useStyles();
  const sourceColumnKey = String(column?.options?.sourceColumnKey || '');
  const sourceRawValue = sourceColumnKey ? order?.values?.[sourceColumnKey] : '';
  const transformedValue = useMemo(
    () => applyImageTransforms(sourceRawValue, column?.options?.transforms),
    [column?.options?.transforms, sourceRawValue]
  );
  const linkedRows = useMemo(() => getLinkedRowPreview(order?.lines), [order?.lines]);
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
              <div>Bronkolom: {sourceColumnKey || '-'}</div>
              <div>Originele waarde: {formatPlainValue(sourceRawValue)}</div>
              <div>Na transformatie: {formatPlainValue(transformedValue)}</div>
            </div>

            <div className={styles.block}>
              <div className={styles.title}>Gegevens van gelinkte tabel</div>
              {!linkedRows.length ? (
                <div className={styles.muted}>Geen gekoppelde regels gevonden.</div>
              ) : (
                linkedRows.map((row, index) => (
                  <div key={`${row.lineNumber}-${index}`} className={styles.lineRow}>
                    <div><strong>Regel {row.lineNumber}:</strong></div>
                    {row.fields.length ? row.fields.map((field) => (
                      <div key={`${field.key}-${index}`}>{field.key}: {field.value}</div>
                    )) : <div className={styles.muted}>Geen waarden</div>}
                  </div>
                ))
              )}
              {Array.isArray(order?.lines) && order.lines.length > MAX_LINKED_ROWS ? (
                <div className={styles.muted}>Alleen eerste {MAX_LINKED_ROWS} regels getoond.</div>
              ) : null}
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
