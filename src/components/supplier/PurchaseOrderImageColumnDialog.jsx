import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { applyImageTransforms, resolveImageUrlFromConfig } from '../../utils/imageColumnUrl';
import {
  PLACEHOLDER_TOKEN,
  TRANSFORM_TYPES,
  makeTransformDraft,
  normalizeTransform,
  toPreviewTransforms,
} from './imageColumnDialogTransforms';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  helperText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  transformHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transformRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    ...shorthands.padding('8px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  transformTop: {
    display: 'flex',
    ...shorthands.gap('6px'),
  },
  transformInputs: {
    display: 'flex',
    ...shorthands.gap('6px'),
  },
  previewBox: {
    ...shorthands.padding('8px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  previewImage: {
    width: '100%',
    minHeight: '120px',
    maxHeight: '220px',
    objectFit: 'cover',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusSmall,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
});

export default function PurchaseOrderImageColumnDialog({
  open,
  onOpenChange,
  onSubmit,
  sourceColumn,
  availableColumns = [],
  initialValue = null,
  sampleRowValues = {},
}) {
  const styles = useStyles();
  const [label, setLabel] = useState('');
  const [urlTemplate, setUrlTemplate] = useState('');
  const [sourceColumnKey, setSourceColumnKey] = useState('');
  const [transforms, setTransforms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(initialValue?.id);

  const sourceOptions = useMemo(
    () => (Array.isArray(availableColumns) ? availableColumns : []).filter((col) => {
      if (!col || col.level !== 'header' || !col.key) return false;
      if (isEdit && col.key === initialValue?.key) return false;
      return true;
    }),
    [availableColumns, initialValue?.key, isEdit]
  );
  const selectedSourceLabel = useMemo(
    () => sourceOptions.find((col) => col.key === sourceColumnKey)?.label || '',
    [sourceOptions, sourceColumnKey]
  );

  useEffect(() => {
    if (!open) return;
    const initialOptions = initialValue?.options && typeof initialValue.options === 'object' ? initialValue.options : {};
    setLabel(String(initialValue?.label || '').trim() || 'Plaatje');
    setUrlTemplate(String(initialOptions.urlTemplate || ''));
    setSourceColumnKey(String(initialOptions.sourceColumnKey || sourceColumn?.key || ''));
    const initialTransforms = Array.isArray(initialOptions.transforms)
      ? initialOptions.transforms.map((tf) => ({
          type: tf?.type || 'trim',
          value: tf?.value || '',
          from: tf?.from || '',
          to: tf?.to || '',
          start: tf?.start === undefined || tf?.start === null ? '' : String(tf.start),
          end: tf?.end === undefined || tf?.end === null ? '' : String(tf.end),
        }))
      : [];
    setTransforms(initialTransforms);
    setSaving(false);
    setError('');
  }, [initialValue, open, sourceColumn?.key]);

  const sampleRawValue = useMemo(() => {
    const value = sampleRowValues?.[sourceColumnKey];
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  }, [sampleRowValues, sourceColumnKey]);
  const previewTransforms = useMemo(() => toPreviewTransforms(transforms), [transforms]);
  const sampleTransformedValue = useMemo(
    () => (sampleRawValue ? applyImageTransforms(sampleRawValue, previewTransforms) : ''),
    [previewTransforms, sampleRawValue]
  );
  const previewUrl = useMemo(
    () => resolveImageUrlFromConfig({ urlTemplate, sourceColumnKey, transforms: previewTransforms }, sampleRowValues),
    [previewTransforms, sampleRowValues, sourceColumnKey, urlTemplate]
  );

  const addTransform = useCallback(() => setTransforms((prev) => [...prev, makeTransformDraft()]), []);
  const removeTransform = useCallback((index) => {
    setTransforms((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const updateTransform = useCallback((index, patch) => {
    setTransforms((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);
  const handleSubmit = useCallback(async () => {
    const cleanLabel = String(label || '').trim();
    const cleanTemplate = String(urlTemplate || '').trim();
    if (!cleanLabel) return setError('Geef een kolomnaam op.');
    if (!/^https?:\/\//i.test(cleanTemplate)) return setError('urlTemplate moet beginnen met http:// of https://.');
    if (!cleanTemplate.includes(PLACEHOLDER_TOKEN)) return setError(`urlTemplate moet ${PLACEHOLDER_TOKEN} bevatten.`);
    if (!sourceColumnKey) return setError('Kies een bron-kolom.');

    let normalizedTransforms = [];
    try {
      normalizedTransforms = transforms.map(normalizeTransform);
    } catch (err) {
      return setError(err?.message || 'Ongeldige transformatie.');
    }

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        label: cleanLabel,
        options: {
          urlTemplate: cleanTemplate,
          sourceColumnKey,
          transforms: normalizedTransforms,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Plaatjekolom opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }, [label, onOpenChange, onSubmit, sourceColumnKey, transforms, urlTemplate]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{isEdit ? 'Plaatjekolom bewerken' : 'Plaatjekolom toevoegen'}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Text className={styles.helperText}>
                Kolom rechts van: {sourceColumn?.label || '-'} ({sourceColumn?.key || '-'})
              </Text>

              <Field label="Naam" required>
                <Input value={label} onChange={(_, data) => setLabel(data.value)} />
              </Field>
              <Field label="URL-template" required hint={`Gebruik ${PLACEHOLDER_TOKEN} als placeholder.`}>
                <Input value={urlTemplate} onChange={(_, data) => setUrlTemplate(data.value)} placeholder="https://host/img/{xxx}.jpg" />
              </Field>
              <Field label="Bron-kolom" required>
                <Dropdown
                  placeholder="Kies bron-kolom"
                  selectedOptions={sourceColumnKey ? [sourceColumnKey] : []}
                  value={selectedSourceLabel}
                  onOptionSelect={(_, data) => data.optionValue && setSourceColumnKey(data.optionValue)}
                >
                  {sourceOptions.map((col) => (
                    <Option key={col.key} value={col.key} text={col.label}>
                      {col.label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <div className={styles.transformHeader}>
                <Text weight="semibold">Transformaties</Text>
                <Button size="small" appearance="secondary" onClick={addTransform}>+ Toevoegen</Button>
              </div>
              {transforms.map((tf, index) => (
                <div key={index} className={styles.transformRow}>
                  <div className={styles.transformTop}>
                    <Dropdown
                      selectedOptions={[tf.type]}
                      value={TRANSFORM_TYPES[tf.type]}
                      onOptionSelect={(_, data) => data.optionValue && updateTransform(index, { type: data.optionValue })}
                    >
                      {Object.entries(TRANSFORM_TYPES).map(([value, labelText]) => (
                        <Option key={value} value={value} text={labelText}>{labelText}</Option>
                      ))}
                    </Dropdown>
                    <Button size="small" appearance="subtle" onClick={() => removeTransform(index)}>x</Button>
                  </div>
                  {tf.type === 'remove' ? (
                    <Input value={tf.value} placeholder="Te verwijderen tekst" onChange={(_, data) => updateTransform(index, { value: data.value })} />
                  ) : null}
                  {tf.type === 'replace' ? (
                    <div className={styles.transformInputs}>
                      <Input value={tf.from} placeholder="Van" onChange={(_, data) => updateTransform(index, { from: data.value })} />
                      <Input value={tf.to} placeholder="Naar" onChange={(_, data) => updateTransform(index, { to: data.value })} />
                    </div>
                  ) : null}
                  {tf.type === 'substring' ? (
                    <div className={styles.transformInputs}>
                      <Input type="number" min={0} value={tf.start} placeholder="Start" onChange={(_, data) => updateTransform(index, { start: data.value })} />
                      <Input type="number" value={tf.end} placeholder="Eind (optioneel)" onChange={(_, data) => updateTransform(index, { end: data.value })} />
                    </div>
                  ) : null}
                </div>
              ))}

              <div className={styles.previewBox}>
                <Text weight="semibold">Preview op basis van eerste rijwaarde</Text>
                <Text>Bronwaarde: {sampleRawValue || <span className={styles.muted}>geen waarde gevonden</span>}</Text>
                <Text>Na transformatie: {sampleTransformedValue || <span className={styles.muted}>-</span>}</Text>
                <Text>URL: {previewUrl || <span className={styles.muted}>ongeldige/onvolledige preview</span>}</Text>
                {previewUrl ? <img className={styles.previewImage} src={previewUrl} alt="Preview plaatje" /> : null}
              </div>
              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
