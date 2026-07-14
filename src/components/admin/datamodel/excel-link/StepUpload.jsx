import React, { useRef, useState } from 'react';
import {
  Badge,
  Button,
  Field,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowUploadRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px') },
  form: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px'), maxWidth: '520px' },
  fileRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  fileName: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tableWrap: {
    maxHeight: '360px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    ...shorthands.padding('8px', '12px'),
  },
  samples: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

/**
 * Stap 1: bestand uploaden (.xlsx/.xls/.csv) + weergavenaam.
 * Toont na upload de gedetecteerde kolommen (key/label/type) met sample-waarden.
 */
export default function StepUpload({ dataset, uploading, uploadError, onUpload }) {
  const styles = useStyles();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
    // Default weergavenaam = bestandsnaam zonder extensie, alleen als nog leeg.
    if (picked && !label) {
      setLabel(picked.name.replace(/\.[^.]+$/, ''));
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.form}>
        <Field label="File (.xlsx, .xls or .csv)">
          <div className={styles.fileRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Button
              appearance="secondary"
              icon={<ArrowUploadRegular />}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
            <span className={styles.fileName}>{file ? file.name : 'No file chosen'}</span>
          </div>
        </Field>

        <Field label="Display name">
          <Input
            value={label}
            placeholder="e.g. Vendor classification 2026"
            onChange={(_, d) => setLabel(d.value)}
          />
        </Field>

        <div>
          <Button
            appearance="primary"
            disabled={!file || uploading}
            icon={uploading ? <Spinner size="tiny" /> : undefined}
            onClick={() => onUpload(file, label)}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>

        {uploadError ? <Text className={styles.error} block>{uploadError}</Text> : null}
      </div>

      {dataset ? (
        <div className={styles.root}>
          <div className={styles.fileRow}>
            <Text weight="semibold">{dataset.label}</Text>
            <Badge appearance="tint" color="success" size="small">
              {(dataset.rowCount || 0).toLocaleString('en-US')} rows
            </Badge>
            <Badge appearance="tint" color="informative" size="small">
              {(dataset.columns?.length || 0)} columns
            </Badge>
          </div>
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={styles.headerCell}>Column</TableHeaderCell>
                  <TableHeaderCell className={styles.headerCell}>Key</TableHeaderCell>
                  <TableHeaderCell className={styles.headerCell}>Type</TableHeaderCell>
                  <TableHeaderCell className={styles.headerCell}>Sample values</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dataset.columns || []).map((col) => (
                  <TableRow key={col.key}>
                    <TableCell>{col.label}</TableCell>
                    <TableCell><span className={styles.mono}>{col.key}</span></TableCell>
                    <TableCell><span className={styles.muted}>{col.dataType || '—'}</span></TableCell>
                    <TableCell>
                      <Text className={styles.samples}>
                        {col.samples?.length ? col.samples.join(' | ') : '—'}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
