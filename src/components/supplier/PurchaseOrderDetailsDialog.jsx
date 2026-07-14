import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Button,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    marginBottom: '16px',
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  sectionTitle: {
    marginBottom: '8px',
    fontWeight: tokens.fontWeightSemibold,
  },
  metaRow: {
    display: 'flex',
    ...shorthands.gap('8px'),
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  metaLabel: {
    color: tokens.colorNeutralForeground3,
    minWidth: '160px',
  },
  tableWrap: {
    maxHeight: '360px',
    overflow: 'auto',
  },
});

export default function PurchaseOrderDetailsDialog({ open, order, onClose }) {
  const styles = useStyles();
  const lines = Array.isArray(order?.lines) ? order.lines : [];

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: '900px' }}>
        <DialogBody>
          <DialogTitle>Purchase order details {order?.orderNumber ? `- ${order.orderNumber}` : ''}</DialogTitle>
          <DialogContent>
            <div className={styles.section}>
              <Text className={styles.sectionTitle} block>Vendor</Text>
              <div className={styles.metaRow}>
                <Text className={styles.metaLabel}>Account</Text>
                <Text>{order?.vendorAccount || '-'}</Text>
              </div>
              <div className={styles.metaRow}>
                <Text className={styles.metaLabel}>Name</Text>
                <Text>{order?.vendorName || '-'}</Text>
              </div>
              <div className={styles.metaRow}>
                <Text className={styles.metaLabel}>Group</Text>
                <Text>{order?.vendorGroup || '-'}</Text>
              </div>
              <div className={styles.metaRow}>
                <Text className={styles.metaLabel}>Email</Text>
                <Text>{order?.vendorEmail || '-'}</Text>
              </div>
            </div>

            <div className={styles.section}>
              <Text className={styles.sectionTitle} block>Lines ({lines.length})</Text>
              <div className={styles.tableWrap}>
                <Table size="small">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Line</TableHeaderCell>
                      <TableHeaderCell>Item</TableHeaderCell>
                      <TableHeaderCell>Description</TableHeaderCell>
                      <TableHeaderCell>Quantity</TableHeaderCell>
                      <TableHeaderCell>Unit</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length ? lines.map((line, index) => (
                      <TableRow key={`${line.lineNumber || index}-${line.itemNumber || ''}`}>
                        <TableCell>{line.lineNumber ?? '-'}</TableCell>
                        <TableCell>{line.itemNumber || '-'}</TableCell>
                        <TableCell>{line.description || '-'}</TableCell>
                        <TableCell>{line.quantity ?? '-'}</TableCell>
                        <TableCell>{line.unit || '-'}</TableCell>
                        <TableCell>{line.lineAmount ?? '-'}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Text>No lines found for this order.</Text>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

