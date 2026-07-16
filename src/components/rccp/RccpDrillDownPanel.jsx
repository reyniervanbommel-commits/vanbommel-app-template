import React, { useCallback, useEffect, useState } from 'react';
import {
  Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle,
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Badge, Spinner, Text,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import { formatWeekLabel } from './rccpUtils';

export default function RccpDrillDownPanel({ cell, window, open, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !cell) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
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
          action={<Dismiss24Regular onClick={handleClose} aria-label="Close drill-down" role="button" />}
        >
          Drill-down — {cell?.measureKey} / {formatWeekLabel(cell?.periodYear, cell?.isoWeek)}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {loading && <Spinner label="Loading PO lines..." />}
        {error && <Text>{error}</Text>}
        {!loading && !error && (
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Line</TableHeaderCell>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
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
                  <TableCell>{row.quantity}</TableCell>
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
