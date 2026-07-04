import React, { useCallback, useMemo, useState } from 'react';
import { Button, Dropdown, Input, Option, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  subPaneTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
  },
  typeButton: {
    justifyContent: 'flex-start',
  },
  configForm: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  fieldLabel: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  transformsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transformRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('6px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  transformInputs: {
    display: 'flex',
    ...shorthands.gap('4px'),
  },
  actionRow: {
    display: 'flex',
    ...shorthands.gap('6px'),
    marginTop: '4px',
  },
});

// Monday-stijl kolomtypes voor "Kolom rechts toevoegen". label = standaardnaam
// (direct inline te hernoemen); dataType mapt op de backend-datatypes.
export const NEW_COLUMN_TYPES = [
  { key: 'status', label: 'Status', dataType: 'select', options: ['Nieuw', 'Bezig', 'Klaar'] },
  { key: 'text', label: 'Tekst', dataType: 'text' },
  { key: 'number', label: 'Nummers', dataType: 'number' },
  { key: 'date', label: 'Datum', dataType: 'date' },
  { key: 'boolean', label: 'Ja/nee', dataType: 'boolean' },
  { key: 'image', label: 'Plaatje', dataType: 'image' },
];

const TRANSFORM_TYPES = {
  trim: 'Trim',
  remove: 'Verwijder tekst',
  replace: 'Vervang',
  substring: 'Deelreeks',
};

function makeTransformDraft() {
  return { type: 'trim', value: '', from: '', to: '', start: '', end: '' };
}

// Normaliseert een UI-transform-draft naar de backend-vorm (zie validateImageTransform
// in PurchaseOrderColumnsService.js). Gooit een Error met leesbare boodschap bij een
// onvolledige rij, zodat we die inline kunnen tonen en bevestigen blokkeren.
function normalizeTransform(draft, index) {
  const label = `Transform #${index + 1}`;
  switch (draft.type) {
    case 'trim':
      return { type: 'trim' };
    case 'remove':
      if (!draft.value) throw new Error(`${label}: 'Verwijder tekst' vereist een waarde.`);
      return { type: 'remove', value: draft.value };
    case 'replace':
      if (!draft.from) throw new Error(`${label}: 'Vervang' vereist een 'van'-waarde.`);
      return { type: 'replace', from: draft.from, to: draft.to };
    case 'substring': {
      const start = Number(draft.start);
      if (!Number.isInteger(start) || start < 0) {
        throw new Error(`${label}: 'Deelreeks' vereist een geheel startgetal >= 0.`);
      }
      const result = { type: 'substring', start };
      if (draft.end !== '' && draft.end !== null && draft.end !== undefined) {
        const end = Number(draft.end);
        if (!Number.isInteger(end)) throw new Error(`${label}: 'Deelreeks' eind moet een geheel getal zijn.`);
        result.end = end;
      }
      return result;
    }
    default:
      throw new Error(`${label}: onbekend type.`);
  }
}

// Sub-pane voor "Kolom rechts toevoegen": eerst een type kiezen, en voor 'Plaatje'
// een tweede stap met de image-configuratie (urlTemplate, bron-kolom, transforms).
// Bij bevestigen roept hij onConfirm(typeDef) aan; de parent doet het toevoegen +
// popover sluiten (zelfde afsluitgedrag als de andere types).
function PurchaseOrderAddColumnPane({ availableColumns = [], onConfirm }) {
  const styles = useStyles();
  const [step, setStep] = useState('types');
  const [urlTemplate, setUrlTemplate] = useState('');
  const [sourceColumnKey, setSourceColumnKey] = useState('');
  const [transforms, setTransforms] = useState([]);
  const [error, setError] = useState('');

  // Alleen header-kolommen (level !== 'line') als bron; de nog-niet-bestaande image-
  // kolom kan per definitie niet in de lijst staan, dus geen extra filter nodig.
  const sourceOptions = useMemo(
    () => (availableColumns || []).filter((col) => col && col.level !== 'line' && col.key),
    [availableColumns]
  );
  const selectedSourceLabel = useMemo(
    () => sourceOptions.find((col) => col.key === sourceColumnKey)?.label || '',
    [sourceOptions, sourceColumnKey]
  );

  const handleTypeClick = useCallback((type) => {
    if (type.dataType === 'image') {
      setStep('image');
      setError('');
      return;
    }
    onConfirm(type);
  }, [onConfirm]);

  const handleSourceSelect = useCallback((_, data) => {
    if (!data.optionValue) return;
    setSourceColumnKey(data.optionValue);
  }, []);

  const addTransform = useCallback(() => {
    setTransforms((prev) => [...prev, makeTransformDraft()]);
  }, []);
  const removeTransform = useCallback((index) => {
    setTransforms((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const updateTransform = useCallback((index, patch) => {
    setTransforms((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const handleConfirm = useCallback(() => {
    const template = urlTemplate.trim();
    if (!/^https?:\/\//i.test(template)) {
      setError('urlTemplate moet beginnen met http:// of https://.');
      return;
    }
    if (!template.includes('{xxx}')) {
      setError('urlTemplate moet de placeholder {xxx} bevatten.');
      return;
    }
    if (!sourceColumnKey) {
      setError('Kies een bron-kolom.');
      return;
    }
    let normalized;
    try {
      normalized = transforms.map(normalizeTransform);
    } catch (err) {
      setError(err.message);
      return;
    }
    setError('');
    onConfirm({
      key: 'image',
      label: 'Plaatje',
      dataType: 'image',
      options: { urlTemplate: template, sourceColumnKey, transforms: normalized },
    });
  }, [urlTemplate, sourceColumnKey, transforms, onConfirm]);

  if (step === 'types') {
    return (
      <>
        <Text className={styles.subPaneTitle}>Kolomtype</Text>
        {NEW_COLUMN_TYPES.map((type) => (
          <Button
            key={type.key}
            className={styles.typeButton}
            appearance="subtle"
            size="small"
            onClick={() => handleTypeClick(type)}
          >
            {type.label}
          </Button>
        ))}
      </>
    );
  }

  return (
    <div className={styles.configForm}>
      <Text className={styles.subPaneTitle}>Plaatje instellen</Text>
      <Text className={styles.fieldLabel}>URL-sjabloon</Text>
      <Input
        value={urlTemplate}
        onChange={(e) => setUrlTemplate(e.target.value)}
        placeholder="https://host/img/{xxx}.jpg"
      />
      <Text className={styles.hint}>Gebruik {'{xxx}'} als plek voor de bronwaarde (verplicht).</Text>

      <Text className={styles.fieldLabel}>Bron-kolom</Text>
      <Dropdown
        placeholder="Kies kolom"
        selectedOptions={sourceColumnKey ? [sourceColumnKey] : []}
        value={selectedSourceLabel}
        onOptionSelect={handleSourceSelect}
      >
        {sourceOptions.map((col) => (
          <Option key={col.key} value={col.key} text={col.label}>
            {col.label}
          </Option>
        ))}
      </Dropdown>

      <div className={styles.transformsHeader}>
        <Text className={styles.fieldLabel}>Transformaties</Text>
        <Button appearance="subtle" size="small" onClick={addTransform}>+ Toevoegen</Button>
      </div>
      {transforms.map((tf, index) => (
        <div key={index} className={styles.transformRow}>
          <div className={styles.transformInputs}>
            <Dropdown
              selectedOptions={[tf.type]}
              value={TRANSFORM_TYPES[tf.type]}
              onOptionSelect={(_, data) => data.optionValue && updateTransform(index, { type: data.optionValue })}
            >
              {Object.entries(TRANSFORM_TYPES).map(([key, label]) => (
                <Option key={key} value={key} text={label}>{label}</Option>
              ))}
            </Dropdown>
            <Button appearance="subtle" size="small" onClick={() => removeTransform(index)}>×</Button>
          </div>
          {tf.type === 'remove' ? (
            <Input value={tf.value} onChange={(e) => updateTransform(index, { value: e.target.value })} placeholder="Te verwijderen tekst" />
          ) : null}
          {tf.type === 'replace' ? (
            <div className={styles.transformInputs}>
              <Input value={tf.from} onChange={(e) => updateTransform(index, { from: e.target.value })} placeholder="Van" />
              <Input value={tf.to} onChange={(e) => updateTransform(index, { to: e.target.value })} placeholder="Naar" />
            </div>
          ) : null}
          {tf.type === 'substring' ? (
            <div className={styles.transformInputs}>
              <Input type="number" min={0} value={tf.start} onChange={(e) => updateTransform(index, { start: e.target.value })} placeholder="Start" />
              <Input type="number" value={tf.end} onChange={(e) => updateTransform(index, { end: e.target.value })} placeholder="Eind (optioneel)" />
            </div>
          ) : null}
        </div>
      ))}

      {error ? <Text className={styles.error}>{error}</Text> : null}
      <div className={styles.actionRow}>
        <Button appearance="primary" size="small" onClick={handleConfirm}>Toevoegen</Button>
        <Button appearance="secondary" size="small" onClick={() => setStep('types')}>Terug</Button>
      </div>
    </div>
  );
}

export default PurchaseOrderAddColumnPane;
