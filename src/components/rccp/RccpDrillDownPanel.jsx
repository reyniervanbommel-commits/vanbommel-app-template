import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle,
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Badge, Spinner, Text, makeStyles, tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import { formatWeekLabel } from './rccpUtils';

const useStyles = makeStyles({
  // Fluent v9 table cells are flex containers, so right-aligning needs justifyContent, not textAlign.
  qtyCell: { justifyContent: 'flex-end' },
  error: { color: tokens.colorPaletteRedForeground1 },
  empty: { color: tokens.colorNeutralForeground3 },
});

export default function RccpDrillDownPanel({ cell, window, open, onClose }) {
  const styles = useStyles();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !cell) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      setRows([]);
      try {
        const params = new URLSearchParams({
          vendorAccount: cell.vendorAccount,
          periodYear: String(cell.periodYear),
          isoWeek: String(cell.isoWeek),
          measureKey: cell.measureKey,
          fromYear: String(window.fromYear),
          fromWeek: String(window.fromWeek),
          toYear: String(window.toYear),
          toWeek: String(window.toWeek),
        });
        const data = await apiRequest(`/rccp/drill-down?${params.toString()}`);
        if (active) setRows(data.rows || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load drill-down');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, cell, window]);

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  return (
    <Drawer open={open} position="end" size="large" onOpenChange={(_, data) => { if (!data.open) handleClose(); }}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={(
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              aria-label="Close drill-down"
              onClick={handleClose}
            />
          )}
        >
          Drill-down — {cell?.measureKey} / {formatWeekLabel(cell?.periodYear, cell?.isoWeek)}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {loading && <Spinner label="Loading PO lines..." />}
        {error && <Text className={styles.error}>{error}</Text>}
        {!loading && !error && !rows.length && (
          <Text className={styles.empty}>No purchase order lines for this cell.</Text>
        )}
        {!loading && !error && rows.length > 0 && (
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Line</TableHeaderCell>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell className={styles.qtyCell}>Qty</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.orderNumber}-${row.lineNumber || 'h'}`}>
                  <TableCell>{row.orderNumber}</TableCell>
                  <TableCell>{row.lineNumber || '—'}</TableCell>
                  <TableCell>{row.itemNumber || '—'}</TableCell>
                  <TableCell className={styles.qtyCell}>{row.quantity}</TableCell>
                  <TableCell>
                    {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('en-GB') : '—'}
                    {row.dateFromHeader && <Badge appearance="outline" size="small">Date from order header</Badge>}
                  </TableCell>
                  <TableCell>{row.status || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DrawerBody>
    </Drawer>
  );
}
