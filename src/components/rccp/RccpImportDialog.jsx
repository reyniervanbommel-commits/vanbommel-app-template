import React, { useCallback, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  Spinner, Text, makeStyles, shorthands,
} from '@fluentui/react-components';
import { ArrowUpload24Regular, ArrowDownload24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px') },
  summary: { whiteSpace: 'pre-wrap' },
});

export default function RccpImportDialog({ readOnly, onImported }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadTemplate = useCallback(async () => {
    const response = await fetch('/api/rccp/import/template', { credentials: 'include' });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rccp-capacity-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/rccp/import/preview', { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data);
    } catch (err) {
      setError(err.message || 'Preview failed');
    } finally {
      setBusy(false);
    }
  }, [file]);

  const handleCommit = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/rccp/import/commit', { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');
      setOpen(false);
      setPreview(null);
      setFile(null);
      onImported?.(data);
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  }, [file, onImported]);

  return (
    <>
      <Button appearance="secondary" icon={<ArrowUpload24Regular />} disabled={readOnly} onClick={() => setOpen(true)}>
        Import Excel
      </Button>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import RCCP capacity</DialogTitle>
            <DialogContent className={styles.body}>
              <Button appearance="subtle" icon={<ArrowDownload24Regular />} onClick={handleDownloadTemplate}>
                Download template
              </Button>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button onClick={handlePreview} disabled={!file || busy}>Preview</Button>
              {preview && (
                <Text className={styles.summary}>
                  Valid: {preview.valid?.length || 0}
                  {' | '}Invalid: {preview.invalid?.length || 0}
                  {' | '}Duplicates: {preview.duplicates?.length || 0}
                </Text>
              )}
              {error && <Text>{error}</Text>}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)}>Close</Button>
              <Button appearance="primary" onClick={handleCommit} disabled={!preview || busy || (preview.invalid?.length > 0)}>
                {busy ? <Spinner size="tiny" /> : 'Commit import'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
