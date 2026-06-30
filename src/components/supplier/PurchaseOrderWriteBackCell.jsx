import React, { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  Spinner,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { CloudArrowUpRegular } from '@fluentui/react-icons';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

const useStyles = makeStyles({
  cell: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px') },
  // D365-veld dat terugschrijfbaar is: subtiel onderscheiden van read-only D365-velden.
  editBtn: { minWidth: '22px', width: '22px', height: '22px', ...shorthands.padding('0'), color: tokens.colorBrandForeground1 },
  warn: { marginTop: '8px' },
});

function toInputValue(value, dataType) {
  if (value === null || value === undefined) return '';
  if (dataType === 'date') {
    const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : String(value);
  }
  return String(value);
}

/**
 * Cel voor een D365-veld dat admin als write-back-toegestaan markeerde. Toont de waarde
 * read-only met een knop "Corrigeren in D365"; wijzigen is een bewuste actie met bevestiging,
 * optimistic concurrency (server vergelijkt met de waarde die je zag) en foutmelding.
 */
export default function PurchaseOrderWriteBackCell({ column, value, onCorrect }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openDialog = useCallback(() => {
    setDraft(toInputValue(value, column.dataType));
    setError('');
    setOpen(true);
  }, [value, column.dataType]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await onCorrect({ value: draft, basedOnValue: value });
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Terugschrijven mislukt.');
    } finally {
      setBusy(false);
    }
  }, [draft, value, onCorrect]);

  return (
    <span className={styles.cell}>
      <span>{formatCellValue(value, column.dataType)}</span>
      <Tooltip content="Corrigeren in D365" relationship="label">
        <Button
          size="small"
          appearance="subtle"
          className={styles.editBtn}
          icon={<CloudArrowUpRegular />}
          onClick={openDialog}
          aria-label={`${column.label} corrigeren in D365`}
        />
      </Tooltip>

      <Dialog open={open} onOpenChange={(_, d) => !busy && setOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Corrigeren in D365 — {column.label}</DialogTitle>
            <DialogContent>
              <Field label="Nieuwe waarde">
                <Input
                  type={column.dataType === 'number' ? 'number' : (column.dataType === 'date' ? 'date' : 'text')}
                  value={draft}
                  onChange={(_, data) => setDraft(data.value)}
                />
              </Field>
              <MessageBar intent="warning" className={styles.warn}>
                Dit schrijft de waarde terug naar D365 (veld {column.d365Field}). Als de waarde
                daar intussen is gewijzigd, wordt de actie geweigerd — ververs dan eerst.
              </MessageBar>
              {error ? <MessageBar intent="error" className={styles.warn}>{error}</MessageBar> : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)} disabled={busy}>Annuleren</Button>
              <Button appearance="primary" icon={busy ? <Spinner size="tiny" /> : null} onClick={submit} disabled={busy}>
                {busy ? 'Bezig...' : 'Corrigeren in D365'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </span>
  );
}
