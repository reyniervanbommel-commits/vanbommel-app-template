import React, { memo, useCallback, useState } from 'react';
import {
  Button, Input, Spinner, Table, TableBody, TableCell, TableHeader,
  TableHeaderCell, TableRow, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular, Save24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalM) },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '720px' },
  input: { width: '100%', minWidth: 0 },
  yearInput: { width: '96px' },
  weekInput: { width: '72px' },
  qtyInput: { width: '120px' },
  actions: { display: 'flex', ...shorthands.gap(tokens.spacingHorizontalXS), whiteSpace: 'nowrap' },
  empty: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function CapacityRow({
  row, readOnly, onUpdate, onSave, onDelete,
}) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);

  const handleFieldChange = useCallback((field) => (event) => {
    onUpdate(row.localKey, field, event.target.value);
  }, [onUpdate, row.localKey]);

  const handleSave = useCallback(async () => {
    setBusy(true);
    await onSave(row);
    setBusy(false);
  }, [onSave, row]);

  const handleDelete = useCallback(async () => {
    setBusy(true);
    await onDelete(row);
    setBusy(false);
  }, [onDelete, row]);

  return (
    <TableRow>
      <TableCell>
        <Input
          className={styles.input}
          value={row.vendorAccount}
          disabled={readOnly || busy}
          onChange={handleFieldChange('vendorAccount')}
          aria-label="Vendor code"
        />
      </TableCell>
      <TableCell>
        <Input
          className={styles.yearInput}
          type="number"
          value={String(row.periodYear ?? '')}
          disabled={readOnly || busy}
          onChange={handleFieldChange('periodYear')}
          aria-label="Year"
        />
      </TableCell>
      <TableCell>
        <Input
          className={styles.weekInput}
          type="number"
          min={1}
          max={53}
          value={String(row.isoWeek ?? '')}
          disabled={readOnly || busy}
          onChange={handleFieldChange('isoWeek')}
          aria-label="ISO week"
        />
      </TableCell>
      <TableCell>
        <Input
          className={styles.input}
          value={row.capacityCategory}
          disabled={readOnly || busy}
          onChange={handleFieldChange('capacityCategory')}
          aria-label="Capacity category"
        />
      </TableCell>
      <TableCell>
        <Input
          className={styles.qtyInput}
          type="number"
          value={String(row.availableQty ?? '')}
          disabled={readOnly || busy}
          onChange={handleFieldChange('availableQty')}
          aria-label="Capacity quantity"
        />
      </TableCell>
      {!readOnly && (
        <TableCell>
          <div className={styles.actions}>
            <Button
              size="small"
              icon={busy ? <Spinner size="tiny" /> : <Save24Regular />}
              onClick={handleSave}
              disabled={busy}
              aria-label="Save row"
            />
            <Button
              size="small"
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={handleDelete}
              disabled={busy}
              aria-label="Delete row"
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

const MemoCapacityRow = memo(CapacityRow);

export default function RccpCapacityPlanningTable({
  rows,
  readOnly,
  rowError,
  onUpdate,
  onSave,
  onDelete,
}) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.tableWrap}>
        <Table className={styles.table} aria-label="Capacity planning">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>VendorCode</TableHeaderCell>
              <TableHeaderCell>Year</TableHeaderCell>
              <TableHeaderCell>ISOWeek</TableHeaderCell>
              <TableHeaderCell>CapacityCategory</TableHeaderCell>
              <TableHeaderCell>CapacityQuantity</TableHeaderCell>
              {!readOnly && <TableHeaderCell>Actions</TableHeaderCell>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <MemoCapacityRow
                key={row.localKey}
                row={row}
                readOnly={readOnly}
                onUpdate={onUpdate}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {!rows.length && (
        <Text className={styles.empty}>No capacity records yet. Import Excel or add a row.</Text>
      )}
      {rowError && <Text className={styles.error}>{rowError}</Text>}
    </div>
  );
}