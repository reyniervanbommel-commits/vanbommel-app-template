import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import {
  Add24Regular,
  ArrowLeft24Regular,
  ArrowRight24Regular,
  CheckmarkCircle24Regular,
  PlugConnected24Regular,
  Save24Regular,
  Search24Regular,
} from '@fluentui/react-icons';
import {
  listTables,
  createTable,
  getTable,
  listSources,
  testSource,
  discoverFields,
  saveColumns,
  saveRelation,
} from '../../utils/tableBuilderApi';

// User Story #139 — admin TableBuilder-wizard.
// Volgt het laad/opslaan-stramien, de loading/error/feedback-states en de
// Fluent UI v9-stijl van AdminODataSettings. Er worden bewust GEEN <Tooltip>-
// componenten in lijsten gebruikt (zie fluentui-valkuilen.mdc); waar een hint
// nodig is gebruiken we native `title` of een Field-hint.

const useStyles = makeStyles({
  root: { maxWidth: '860px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dbHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding('8px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
  },
  stepper: { display: 'flex', ...shorthands.gap('8px'), flexWrap: 'wrap', alignItems: 'center' },
  stepPill: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    ...shorthands.padding('4px', '10px'),
    ...shorthands.borderRadius('999px'),
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    border: `1px solid ${tokens.colorTransparentStroke}`,
  },
  stepPillActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    borderColor: tokens.colorBrandStroke1,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepPillDone: { color: tokens.colorPaletteGreenForeground1 },
  stepIndex: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    ...shorthands.borderRadius('999px'),
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase100,
  },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  sectionTitle: { marginBottom: '4px' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, wordBreak: 'break-all' },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', flexWrap: 'wrap' },
  spread: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  list: { display: 'flex', flexDirection: 'column', ...shorthands.gap('8px') },
  selectableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('10px', '12px'),
    ...shorthands.borderRadius('6px'),
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  selectableRowActive: {
    borderColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  rowMain: { display: 'flex', flexDirection: 'column', ...shorthands.gap('2px') },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    ...shorthands.padding('12px'),
    textAlign: 'center',
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(160px, 1.4fr) minmax(120px, 1fr) auto auto auto',
    alignItems: 'center',
    ...shorthands.gap('10px'),
    ...shorthands.padding('8px', '10px'),
    ...shorthands.borderRadius('6px'),
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  fieldRowDisabled: { opacity: 0.55 },
  fieldMeta: { display: 'flex', flexDirection: 'column' },
  summaryGrid: { display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  summaryRow: { display: 'flex', ...shorthands.gap('8px'), alignItems: 'center', flexWrap: 'wrap' },
  summaryLabel: { color: tokens.colorNeutralForeground3, minWidth: '190px', fontSize: tokens.fontSizeBase200 },
});

const DATA_TYPES = [
  { value: 'text', label: 'Tekst' },
  { value: 'number', label: 'Getal' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja/nee' },
  { value: 'select', label: 'Keuzelijst' },
];
const DATA_TYPE_LABELS = Object.fromEntries(DATA_TYPES.map((t) => [t.value, t.label]));

// Waarden moeten matchen met CK_tb_tables_cache_mode (migratie 011): auto | always | never.
const CACHE_MODES = [
  { value: 'auto', label: 'Automatisch (verversen na verouderd)' },
  { value: 'always', label: 'Altijd verversen' },
  { value: 'never', label: 'Nooit (live uit bron)' },
];
const CACHE_MODE_LABELS = Object.fromEntries(CACHE_MODES.map((c) => [c.value, c.label]));

const STEPS = [
  { key: 'source', label: 'Bron' },
  { key: 'table', label: 'Tabel & entiteit' },
  { key: 'fields', label: 'Velden' },
  { key: 'relation', label: 'Detail-relatie' },
  { key: 'publish', label: 'Publiceren' },
];

// Bepaalt of een ontdekt/gecureerd veld standaard aangevinkt moet zijn.
function fieldRowFromDiscovered(f) {
  return {
    field: f.field,
    label: f.label || f.field,
    dataType: f.dataType || 'text',
    scope: f.scope,
    nullable: f.nullable,
    // alreadyCurated → curated: veld is al opgeslagen, dus voorgevinkt.
    curated: !!f.alreadyCurated,
    isDefaultVisible: !!f.alreadyCurated,
    filterable: false,
    sortable: false,
  };
}

export default function TableBuilder() {
  const styles = useStyles();

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  // Bron
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Tabellen
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState(null); // volledig object incl. relation/columns
  const [newTableForm, setNewTableForm] = useState({
    label: '',
    sourceEntity: '/data/PurchaseOrderHeadersV2',
    keyFields: '',
    cacheMode: 'auto',
  });

  // Velden
  const [masterFields, setMasterFields] = useState([]);
  const [detailFields, setDetailFields] = useState([]);
  const [masterSearch, setMasterSearch] = useState('');
  const [detailSearch, setDetailSearch] = useState('');

  // Relatie
  const [relationForm, setRelationForm] = useState({
    detailSourceEntity: '',
    kind: 'expand', // CK_tb_relations_kind: expand | fk_join | none (D365 nav-property = expand)
    detailKeyFields: '',
    joinKeys: '',
  });

  // --- Laden ----------------------------------------------------------------

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [srcData, tblData] = await Promise.all([listSources(), listTables({ includeInactive: false })]);
      setSources(srcData.sources || []);
      setTables(tblData.tables || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const resetFeedback = useCallback(() => { setFeedback(''); setError(''); }, []);

  // --- Stap 1: bron --------------------------------------------------------

  const selectSource = useCallback((id) => {
    setSelectedSourceId(id);
    setTestResult(null);
    resetFeedback();
  }, [resetFeedback]);

  const handleTestSource = useCallback(async () => {
    if (!selectedSourceId) return;
    setBusy(true);
    resetFeedback();
    setTestResult(null);
    try {
      const res = await testSource(selectedSourceId);
      setTestResult(res);
      if (res.ok) setFeedback(res.message || 'Verbinding geslaagd.');
      else setError(res.message || 'Verbinding mislukt.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [selectedSourceId, resetFeedback]);

  // --- Stap 2: tabel selecteren / aanmaken ---------------------------------

  const loadTableDetail = useCallback(async (id) => {
    setBusy(true);
    resetFeedback();
    try {
      const { table } = await getTable(id);
      setActiveTable(table);
      if (table.relation) {
        setRelationForm({
          detailSourceEntity: table.relation.detailSourceEntity || '',
          kind: table.relation.kind || 'expand',
          detailKeyFields: (table.relation.detailKeyFields || []).join(', '),
          joinKeys: Array.isArray(table.relation.joinKeys)
            ? table.relation.joinKeys.join(', ')
            : (table.relation.joinKeys || ''),
        });
      }
      return table;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [resetFeedback]);

  const handleSelectExistingTable = useCallback(async (id) => {
    const table = await loadTableDetail(id);
    if (table) setStepIndex(2);
  }, [loadTableDetail]);

  const handleCreateTable = useCallback(async () => {
    const label = newTableForm.label.trim();
    const sourceEntity = newTableForm.sourceEntity.trim();
    if (!label) { setError('Geef een tabel-label op.'); return; }
    if (!sourceEntity) { setError('Geef een bron-entiteit op (bv. /data/PurchaseOrderHeadersV2).'); return; }
    if (!selectedSourceId) { setError('Kies eerst een bron in stap 1.'); return; }
    setBusy(true);
    resetFeedback();
    try {
      const keyFields = newTableForm.keyFields
        .split(',').map((s) => s.trim()).filter(Boolean);
      const { table } = await createTable({
        label,
        sourceId: selectedSourceId,
        sourceEntity,
        keyFields: keyFields.length ? keyFields : undefined,
        cacheMode: newTableForm.cacheMode,
      });
      setFeedback(`Tabel "${label}" aangemaakt.`);
      // Herlaad lijst en open het detail zodat we velden kunnen ontdekken.
      const tblData = await listTables({ includeInactive: false });
      setTables(tblData.tables || []);
      const full = await loadTableDetail(table.id);
      if (full) setStepIndex(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [newTableForm, selectedSourceId, resetFeedback, loadTableDetail]);

  // --- Stap 3: velden ontdekken & cureren ----------------------------------

  const handleDiscover = useCallback(async () => {
    if (!activeTable) return;
    setBusy(true);
    resetFeedback();
    try {
      const { fields } = await discoverFields(activeTable.id);
      const rows = (fields || []).map(fieldRowFromDiscovered);
      setMasterFields(rows.filter((r) => r.scope === 'master'));
      setDetailFields(rows.filter((r) => r.scope === 'detail'));
      setFeedback(`${rows.length} veld(en) ontdekt.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [activeTable, resetFeedback]);

  // Ontdek automatisch bij binnenkomst in stap 3 als er nog niets is.
  useEffect(() => {
    if (stepIndex === 2 && activeTable && masterFields.length === 0 && detailFields.length === 0) {
      handleDiscover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, activeTable]);

  const updateField = useCallback((scope, fieldName, patch) => {
    const setter = scope === 'master' ? setMasterFields : setDetailFields;
    setter((prev) => prev.map((r) => (r.field === fieldName ? { ...r, ...patch } : r)));
    setFeedback('');
  }, []);

  const handleSaveColumns = useCallback(async () => {
    if (!activeTable) return;
    const selected = [...masterFields, ...detailFields].filter((r) => r.curated);
    if (selected.length === 0) { setError('Selecteer minimaal één veld om te cureren.'); return; }
    setBusy(true);
    resetFeedback();
    try {
      const columns = selected.map((r) => ({
        scope: r.scope,
        sourceField: r.field,
        label: r.label,
        dataType: r.dataType,
        isDefaultVisible: r.isDefaultVisible,
        filterable: r.filterable,
        sortable: r.sortable,
      }));
      await saveColumns(activeTable.id, columns);
      setFeedback(`${columns.length} kolom(men) opgeslagen.`);
      await loadTableDetail(activeTable.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [activeTable, masterFields, detailFields, resetFeedback, loadTableDetail]);

  // --- Stap 4: detail-relatie ----------------------------------------------

  const handleSaveRelation = useCallback(async () => {
    if (!activeTable) return;
    const detailSourceEntity = relationForm.detailSourceEntity.trim();
    if (!detailSourceEntity) { setError('Geef een detail-entiteit op of sla deze stap over.'); return; }
    setBusy(true);
    resetFeedback();
    try {
      const detailKeyFields = relationForm.detailKeyFields
        .split(',').map((s) => s.trim()).filter(Boolean);
      const joinKeys = relationForm.joinKeys
        .split(',').map((s) => s.trim()).filter(Boolean);
      await saveRelation(activeTable.id, {
        detailSourceEntity,
        kind: relationForm.kind || undefined,
        detailKeyFields: detailKeyFields.length ? detailKeyFields : undefined,
        joinKeys: joinKeys.length ? joinKeys : undefined,
      });
      setFeedback('Detail-relatie opgeslagen.');
      await loadTableDetail(activeTable.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [activeTable, relationForm, resetFeedback, loadTableDetail]);

  // --- Navigatie -----------------------------------------------------------

  const goStep = useCallback((idx) => { setStepIndex(idx); resetFeedback(); }, [resetFeedback]);

  const canNext = useMemo(() => {
    if (stepIndex === 0) return !!selectedSourceId;
    if (stepIndex === 1) return !!activeTable;
    return true;
  }, [stepIndex, selectedSourceId, activeTable]);

  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedSourceId) || null,
    [sources, selectedSourceId],
  );

  if (loading) return <Spinner label="Laden uit database..." />;

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Text size={600} weight="semibold">Table Builder</Text>
      </div>

      <Text className={styles.dbHint} block>
        Bouw data-gedreven tabellen (registry <strong>dbo.tb_tables</strong>). Nieuwe tabellen
        verschijnen automatisch in de app — er is geen hardcoded menu nodig.
      </Text>

      {/* Stap-indicator */}
      <div className={styles.stepper} role="list" aria-label="Wizard-stappen">
        {STEPS.map((step, i) => (
          <button
            key={step.key}
            type="button"
            role="listitem"
            className={[
              styles.stepPill,
              i === stepIndex ? styles.stepPillActive : '',
              i < stepIndex ? styles.stepPillDone : '',
            ].filter(Boolean).join(' ')}
            onClick={() => goStep(i)}
            aria-current={i === stepIndex ? 'step' : undefined}
            disabled={i > stepIndex && !((i === 1 && selectedSourceId) || (i >= 2 && activeTable))}
          >
            <span className={styles.stepIndex}>{i < stepIndex ? '✓' : i + 1}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* --- Stap 1: bron kiezen/verbinden --- */}
      {stepIndex === 0 && (
        <div className={styles.section}>
          <Text weight="semibold" className={styles.sectionTitle}>Stap 1 — Bron kiezen</Text>
          <Text className={styles.hint} block>Kies een geconfigureerde databron en test de verbinding.</Text>
          {sources.length === 0 ? (
            <div className={styles.empty}>Geen bronnen geconfigureerd.</div>
          ) : (
            <div className={styles.list} role="radiogroup" aria-label="Bronnen">
              {sources.map((src) => {
                const active = src.id === selectedSourceId;
                return (
                  <button
                    key={src.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={[styles.selectableRow, active ? styles.selectableRowActive : ''].filter(Boolean).join(' ')}
                    onClick={() => selectSource(src.id)}
                  >
                    <span className={styles.rowMain}>
                      <Text weight="semibold">{src.label || src.key}</Text>
                      <span className={styles.mono}>{src.providerType}{src.key ? ` · ${src.key}` : ''}</span>
                    </span>
                    <Badge appearance="tint" color={src.isActive ? 'success' : 'danger'}>
                      {src.isActive ? 'Actief' : 'Inactief'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.actions}>
            <Button
              appearance="primary"
              icon={<PlugConnected24Regular />}
              onClick={handleTestSource}
              disabled={busy || !selectedSourceId}
            >
              {busy ? 'Testen...' : 'Verbinding testen'}
            </Button>
            {selectedSource && (
              <Text className={styles.hint}>Geselecteerd: {selectedSource.label || selectedSource.key}</Text>
            )}
          </div>

          {testResult && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Resultaat</span>
                <Badge appearance="tint" color={testResult.ok ? 'success' : 'danger'}>
                  {testResult.ok ? 'OK' : 'Mislukt'}
                </Badge>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Provider</span>
                <span className={styles.mono}>{testResult.providerType || '—'}</span>
              </div>
              {testResult.capabilities && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Mogelijkheden</span>
                  <span className={styles.mono}>
                    {Object.entries(testResult.capabilities)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || '—'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Stap 2: tabel & entiteit --- */}
      {stepIndex === 1 && (
        <>
          <div className={styles.section}>
            <Text weight="semibold" className={styles.sectionTitle}>Stap 2 — Bestaande tabel kiezen</Text>
            {tables.length === 0 ? (
              <div className={styles.empty}>Nog geen tabellen. Maak er hieronder één aan.</div>
            ) : (
              <div className={styles.list}>
                {tables.map((t) => {
                  const active = activeTable && activeTable.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={[styles.selectableRow, active ? styles.selectableRowActive : ''].filter(Boolean).join(' ')}
                      onClick={() => handleSelectExistingTable(t.id)}
                      disabled={busy}
                    >
                      <span className={styles.rowMain}>
                        <Text weight="semibold">{t.label}</Text>
                        <span className={styles.mono}>{t.sourceEntity} · {t.key}</span>
                      </span>
                      <Badge appearance="tint" color={t.isActive ? 'success' : 'warning'}>
                        {t.isActive ? 'Actief' : 'Inactief'}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <Text weight="semibold" className={styles.sectionTitle}>Nieuwe tabel aanmaken</Text>
            <Field label="Label" required>
              <Input
                value={newTableForm.label}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, label: d.value }))}
                placeholder="Bijv. Inkooporders"
              />
            </Field>
            <Field label="Bron-entiteit (source_entity)" required hint="Bijv. /data/PurchaseOrderHeadersV2">
              <Input
                value={newTableForm.sourceEntity}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, sourceEntity: d.value }))}
                placeholder="/data/PurchaseOrderHeadersV2"
              />
            </Field>
            <Field label="Sleutelvelden (komma-gescheiden)" hint="Bijv. PurchaseOrderNumber, DataAreaId">
              <Input
                value={newTableForm.keyFields}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, keyFields: d.value }))}
                placeholder="PurchaseOrderNumber"
              />
            </Field>
            <Field label="Cache-modus">
              <Dropdown
                value={CACHE_MODE_LABELS[newTableForm.cacheMode]}
                selectedOptions={[newTableForm.cacheMode]}
                onOptionSelect={(_, d) => setNewTableForm((p) => ({ ...p, cacheMode: d.optionValue }))}
              >
                {CACHE_MODES.map((c) => (
                  <Option key={c.value} value={c.value}>{c.label}</Option>
                ))}
              </Dropdown>
            </Field>
            <div className={styles.actions}>
              <Button appearance="primary" icon={<Add24Regular />} onClick={handleCreateTable} disabled={busy}>
                {busy ? 'Aanmaken...' : 'Tabel aanmaken'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* --- Stap 3: velden ontdekken & cureren --- */}
      {stepIndex === 2 && (
        <>
          <div className={styles.section}>
            <div className={styles.spread}>
              <Text weight="semibold" className={styles.sectionTitle}>Stap 3 — Velden cureren</Text>
              <Button appearance="secondary" icon={<Search24Regular />} onClick={handleDiscover} disabled={busy}>
                Opnieuw ontdekken
              </Button>
            </div>
            <Text className={styles.hint} block>
              Vink de velden aan die je wilt tonen. Reeds gecureerde velden zijn voorgevinkt.
            </Text>
          </div>

          <FieldSection
            styles={styles}
            title="Master-velden"
            scope="master"
            rows={masterFields}
            search={masterSearch}
            onSearch={setMasterSearch}
            onUpdate={updateField}
          />
          <FieldSection
            styles={styles}
            title="Detail-velden"
            scope="detail"
            rows={detailFields}
            search={detailSearch}
            onSearch={setDetailSearch}
            onUpdate={updateField}
          />

          <div className={styles.actions}>
            <Button appearance="primary" icon={<Save24Regular />} onClick={handleSaveColumns} disabled={busy}>
              {busy ? 'Opslaan...' : 'Kolommen opslaan'}
            </Button>
          </div>
        </>
      )}

      {/* --- Stap 4: detail-relatie (optioneel) --- */}
      {stepIndex === 3 && (
        <div className={styles.section}>
          <Text weight="semibold" className={styles.sectionTitle}>Stap 4 — Detail-relatie (optioneel)</Text>
          <Text className={styles.hint} block>
            Koppel een detail-entiteit (regels) aan deze master-tabel. Laat leeg en ga verder als er geen detail is.
          </Text>
          <Field label="Detail-entiteit (detailSourceEntity)" hint="Bijv. /data/PurchaseOrderLinesV2">
            <Input
              value={relationForm.detailSourceEntity}
              onChange={(_, d) => setRelationForm((p) => ({ ...p, detailSourceEntity: d.value }))}
              placeholder="/data/PurchaseOrderLinesV2"
            />
          </Field>
          <Field label="Detail-sleutelvelden (komma-gescheiden)">
            <Input
              value={relationForm.detailKeyFields}
              onChange={(_, d) => setRelationForm((p) => ({ ...p, detailKeyFields: d.value }))}
              placeholder="PurchaseOrderNumber, LineNumber"
            />
          </Field>
          <Field label="Join-sleutels (komma-gescheiden)" hint="Velden waarop master en detail worden gekoppeld">
            <Input
              value={relationForm.joinKeys}
              onChange={(_, d) => setRelationForm((p) => ({ ...p, joinKeys: d.value }))}
              placeholder="PurchaseOrderNumber"
            />
          </Field>
          <div className={styles.actions}>
            <Button appearance="primary" icon={<Save24Regular />} onClick={handleSaveRelation} disabled={busy}>
              {busy ? 'Opslaan...' : 'Relatie opslaan'}
            </Button>
          </div>
        </div>
      )}

      {/* --- Stap 5: publiceren / overzicht --- */}
      {stepIndex === 4 && (
        <div className={styles.section}>
          <div className={styles.spread}>
            <Text weight="semibold" className={styles.sectionTitle}>Stap 5 — Overzicht</Text>
            <CheckmarkCircle24Regular color={tokens.colorPaletteGreenForeground1} />
          </div>
          {activeTable ? (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tabel</span>
                <Text weight="semibold">{activeTable.label}</Text>
                <Badge appearance="tint" color={activeTable.isActive ? 'success' : 'warning'}>
                  {activeTable.isActive ? 'Actief' : 'Inactief'}
                </Badge>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Bron-entiteit</span>
                <span className={styles.mono}>{activeTable.sourceEntity}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Cache-modus</span>
                <span className={styles.mono}>{activeTable.cacheMode || '—'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Master-kolommen</span>
                <span className={styles.mono}>{(activeTable.columns?.master || []).length}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Detail-kolommen</span>
                <span className={styles.mono}>{(activeTable.columns?.detail || []).length}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Detail-relatie</span>
                <span className={styles.mono}>
                  {activeTable.relation ? activeTable.relation.detailSourceEntity : 'Geen'}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>Geen tabel geselecteerd.</div>
          )}
          <Text className={styles.hint} block>
            De tabel is opgeslagen in <strong>dbo.tb_tables</strong> en verschijnt data-gedreven in de app —
            er is geen hardcoded menu-aanpassing nodig.
          </Text>
        </div>
      )}

      {/* Feedback + navigatie */}
      <div className={styles.actions}>
        <Button
          appearance="secondary"
          icon={<ArrowLeft24Regular />}
          onClick={() => goStep(Math.max(0, stepIndex - 1))}
          disabled={busy || stepIndex === 0}
        >
          Vorige
        </Button>
        <Button
          appearance="secondary"
          icon={<ArrowRight24Regular />}
          iconPosition="after"
          onClick={() => goStep(Math.min(STEPS.length - 1, stepIndex + 1))}
          disabled={busy || stepIndex === STEPS.length - 1 || !canNext}
        >
          Volgende
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {error && <Text className={styles.error}>{error}</Text>}
      </div>
    </div>
  );
}

// Sub-component: één scope-sectie (master of detail) met zoekfilter en rijen.
function FieldSection({ styles, title, scope, rows, search, onSearch, onUpdate }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.field.toLowerCase().includes(q) || (r.label || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className={styles.section}>
      <div className={styles.spread}>
        <Text weight="semibold" className={styles.sectionTitle}>{title}</Text>
        <Input
          contentBefore={<Search24Regular />}
          value={search}
          onChange={(_, d) => onSearch(d.value)}
          placeholder="Zoek veld..."
          aria-label={`Zoek in ${title}`}
        />
      </div>
      {rows.length === 0 ? (
        <div className={styles.empty}>Geen velden in deze scope.</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Geen resultaten voor "{search}".</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((r) => (
            <div
              key={r.field}
              className={[styles.fieldRow, !r.curated ? styles.fieldRowDisabled : ''].filter(Boolean).join(' ')}
              title={r.field}
            >
              <Checkbox
                checked={r.curated}
                onChange={(_, d) => onUpdate(scope, r.field, { curated: !!d.checked })}
                aria-label={`Cureer ${r.field}`}
              />
              <div className={styles.fieldMeta}>
                <Input
                  value={r.label}
                  onChange={(_, d) => onUpdate(scope, r.field, { label: d.value })}
                  aria-label={`Label voor ${r.field}`}
                  disabled={!r.curated}
                />
                <span className={styles.mono}>{r.field}</span>
              </div>
              <Dropdown
                value={DATA_TYPE_LABELS[r.dataType]}
                selectedOptions={[r.dataType]}
                onOptionSelect={(_, d) => onUpdate(scope, r.field, { dataType: d.optionValue })}
                disabled={!r.curated}
                aria-label={`Type voor ${r.field}`}
              >
                {DATA_TYPES.map((t) => (
                  <Option key={t.value} value={t.value}>{t.label}</Option>
                ))}
              </Dropdown>
              <Checkbox
                label="Zichtbaar"
                checked={r.isDefaultVisible}
                disabled={!r.curated}
                onChange={(_, d) => onUpdate(scope, r.field, { isDefaultVisible: !!d.checked })}
              />
              <Checkbox
                label="Filterbaar"
                checked={r.filterable}
                disabled={!r.curated}
                onChange={(_, d) => onUpdate(scope, r.field, { filterable: !!d.checked })}
              />
              <Checkbox
                label="Sorteerbaar"
                checked={r.sortable}
                disabled={!r.curated}
                onChange={(_, d) => onUpdate(scope, r.field, { sortable: !!d.checked })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
