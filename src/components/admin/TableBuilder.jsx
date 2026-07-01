import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dropdown,
  Field,
  Input,
  Option,
  Spinner,
  Text,
  Textarea,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import {
  Add24Regular,
  ArrowLeft24Regular,
  ArrowRight24Regular,
  CheckmarkCircle24Regular,
  Open24Regular,
  PlugConnected24Regular,
  Save24Regular,
  Search24Regular,
  Sparkle24Regular,
} from '@fluentui/react-icons';
import { Link as RouterLink } from 'react-router-dom';
import {
  listTables,
  createTable,
  getTable,
  listSources,
  testSource,
  discoverFields,
  discoverEntities,
  assistTable,
  saveColumns,
  saveRelation,
  listRelations,
  suggestRelation,
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
  // Gedempte voorbeeldwaarde per veld (stap 3). Bewust inline i.p.v. Tooltip
  // (zie fluentui-valkuilen.mdc: geen Tooltip in herhaalde lijstrijen).
  sample: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  // AI-assistent-paneel (accent-achtergrond zodat het opvalt als hulpmiddel).
  assistPanel: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    border: `1px solid ${tokens.colorBrandStroke2}`,
  },
  assistResult: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  chips: { display: 'flex', ...shorthands.gap('6px'), flexWrap: 'wrap' },
  comboOption: { display: 'flex', flexDirection: 'column', ...shorthands.gap('2px') },
  comboOptionSub: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 },
});

const ENTITY_SEARCH_LIMIT = 25;

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
// `suggestedKeys` is een Set van 'scope::field'-sleutels uit een AI-suggestie
// (zie handleAssist/overnemen): matchende velden worden meteen voorgevinkt.
function fieldRowFromDiscovered(f, suggestedKeys) {
  const suggested = suggestedKeys ? suggestedKeys.has(`${f.scope}::${f.field}`) : false;
  const curated = !!f.alreadyCurated || suggested;
  return {
    field: f.field,
    label: f.label || f.field,
    dataType: f.dataType || 'text',
    scope: f.scope,
    nullable: f.nullable,
    // korte voorbeeldwaarde uit echte data, of null → niets tonen.
    sample: f.sample ?? null,
    // alreadyCurated → curated (al opgeslagen); AI-suggestie → curated (voorgevinkt).
    curated,
    isDefaultVisible: curated,
    filterable: false,
    sortable: false,
  };
}

// Kapt lange voorbeeldwaarden af zodat rijen compact blijven.
function truncateSample(value, max = 40) {
  const s = String(value);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Leidt een leesbaar label af uit een entitySet/entiteitpad (fix #4). Neemt het
// laatste padsegment, splitst PascalCase/camelCase en snake_case, en strip een
// trailing versienummer (bv. "PurchaseOrderHeadersV2" → "Purchase Order Headers").
function humanizeEntityLabel(entitySet) {
  if (!entitySet) return '';
  const last = String(entitySet).split(/[/\\]/).filter(Boolean).pop() || '';
  return last
    .replace(/V\d+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
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

  // Zoekbare entiteit-picker (stap 2)
  const [entityQuery, setEntityQuery] = useState('');
  const [entityOptions, setEntityOptions] = useState([]);
  const [entityMeta, setEntityMeta] = useState({ total: 0, truncated: false });
  const [entityLoading, setEntityLoading] = useState(false);

  // AI-authoring-assistent (stap 2)
  const [assistPrompt, setAssistPrompt] = useState('');
  const [assistBusy, setAssistBusy] = useState(false);
  const [assistSuggestion, setAssistSuggestion] = useState(null);
  const [assistError, setAssistError] = useState('');
  // null = onbekend, true = beschikbaar, false = 503 AI_NOT_CONFIGURED (knop verbergen).
  const [assistAvailable, setAssistAvailable] = useState(null);
  // Voorgestelde velden uit een overgenomen suggestie; worden in stap 3
  // voorgevinkt zodra discover geladen is. Set van 'scope::field'.
  const [suggestedFieldKeys, setSuggestedFieldKeys] = useState(null);

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
  // Nav-property-kandidaten (#C): dropdown gevuld uit GET /tables/:id/relations.
  const [relationOptions, setRelationOptions] = useState([]);
  const [relationOptionsLoading, setRelationOptionsLoading] = useState(false);
  // AI-relatiesuggestie: null=onbekend, true=beschikbaar, false=503 (knop verbergen).
  const [relationSuggestAvailable, setRelationSuggestAvailable] = useState(null);
  const [relationSuggestBusy, setRelationSuggestBusy] = useState(false);
  const [relationSuggestReason, setRelationSuggestReason] = useState('');

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
      // Nieuwe/andere tabel → relatie-kandidaten opnieuw laten laden in stap 4.
      setRelationOptions([]);
      setRelationSuggestReason('');
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

  // Zoekbare entiteit-picker: debounce ~300ms → server-side zoeken.
  // Server doorzoekt ~5163 entiteiten, dus we sturen altijd een `q`.
  useEffect(() => {
    const q = entityQuery.trim();
    if (!selectedSourceId || q.length === 0) {
      setEntityOptions([]);
      setEntityMeta({ total: 0, truncated: false });
      setEntityLoading(false);
      return undefined;
    }
    let cancelled = false;
    setEntityLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await discoverEntities(selectedSourceId, { q, limit: ENTITY_SEARCH_LIMIT });
        if (cancelled) return;
        setEntityOptions(res.entities || []);
        setEntityMeta({ total: res.total || 0, truncated: !!res.truncated });
      } catch (err) {
        if (!cancelled) {
          setEntityOptions([]);
          setEntityMeta({ total: 0, truncated: false });
          setError(err.message);
        }
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [entityQuery, selectedSourceId]);

  // Selectie uit de picker: zet sourceEntity op de gekozen entiteit.
  const handleEntitySelect = useCallback((_, data) => {
    // optionValue = sourceEntity (uniek); optionText = name (voor het invoerveld).
    const sourceEntity = data.optionValue;
    if (!sourceEntity) return;
    setNewTableForm((p) => ({ ...p, sourceEntity }));
    setEntityQuery(data.optionText || sourceEntity);
  }, []);

  // --- AI-authoring-assistent ----------------------------------------------

  const handleAssist = useCallback(async () => {
    const prompt = assistPrompt.trim();
    if (!prompt) { setAssistError('Beschrijf eerst wat je zoekt.'); return; }
    if (!selectedSourceId) { setAssistError('Kies eerst een bron in stap 1.'); return; }
    setAssistBusy(true);
    setAssistError('');
    setAssistSuggestion(null);
    try {
      const res = await assistTable({ sourceId: selectedSourceId, prompt });
      setAssistSuggestion(res.suggestion || null);
      setAssistAvailable(true);
    } catch (err) {
      // 503 met code AI_NOT_CONFIGURED → assistent niet ingesteld; knop verbergen.
      if (err.status === 503 && err.data?.code === 'AI_NOT_CONFIGURED') {
        setAssistAvailable(false);
        setAssistError('AI-assistent is niet geconfigureerd (beheerder moet ANTHROPIC_API_KEY instellen).');
      } else {
        setAssistError(err.message || 'AI-suggestie mislukt.');
      }
    } finally {
      setAssistBusy(false);
    }
  }, [assistPrompt, selectedSourceId]);

  // "Overnemen" (fix #4): vult ECHT het aanmaakformulier voor zodat de gebruiker
  // meteen "Tabel aanmaken" kan klikken. Vult sourceEntity + (indien leeg) een
  // gehumaniseerd Label, onthoudt de voorgestelde velden voor stap 3, en geeft
  // duidelijke vervolg-feedback. Faalt nooit stil: bij een lege/incomplete
  // suggestie tonen we een expliciete melding i.p.v. niets te doen.
  const handleAdoptSuggestion = useCallback(() => {
    if (!assistSuggestion) {
      setError('Geen suggestie om over te nemen — vraag eerst een AI-suggestie aan.');
      return;
    }
    const entity = assistSuggestion.sourceEntity || '';
    const entitySet = assistSuggestion.entitySet || entity;
    if (!entity) {
      setError('De AI-suggestie bevat geen bron-entiteit; pas het aanmaakformulier handmatig aan.');
      return;
    }
    // Label afleiden uit entitySet als het veld nog leeg is (fix #4).
    const derivedLabel = humanizeEntityLabel(entitySet);
    setNewTableForm((p) => ({
      ...p,
      sourceEntity: entity,
      label: p.label.trim() ? p.label : (derivedLabel || p.label),
    }));
    setEntityQuery(entitySet);

    const keys = new Set(
      (assistSuggestion.fields || [])
        .filter((f) => f.field)
        .map((f) => `${f.scope || 'master'}::${f.field}`),
    );
    setSuggestedFieldKeys(keys.size ? keys : null);
    setError('');
    setFeedback(
      `Suggestie overgenomen — controleer het label en klik hieronder "Tabel aanmaken". ${
        keys.size ? `${keys.size} veld(en) worden in stap 3 voorgevinkt.` : ''
      }`.trim(),
    );
  }, [assistSuggestion]);

  // --- Stap 3: velden ontdekken & cureren ----------------------------------

  const handleDiscover = useCallback(async () => {
    if (!activeTable) return;
    setBusy(true);
    resetFeedback();
    try {
      // Fix #2 (volgorde detail-velden): geef de reeds gekozen detail-entiteit mee
      // (uit de relatie-picker/AI-suggestie in stap 4) zodat detail-velden óók
      // ontdekt worden vóór de relatie is opgeslagen. Zonder keuze → alleen master.
      const detailSourceEntity = relationForm.detailSourceEntity.trim() || undefined;
      const { fields } = await discoverFields(activeTable.id, { detailSourceEntity });
      const rows = (fields || []).map((f) => fieldRowFromDiscovered(f, suggestedFieldKeys));
      setMasterFields(rows.filter((r) => r.scope === 'master'));
      setDetailFields(rows.filter((r) => r.scope === 'detail'));
      const suggestedHit = suggestedFieldKeys
        ? rows.filter((r) => suggestedFieldKeys.has(`${r.scope}::${r.field}`)).length
        : 0;
      setFeedback(
        suggestedHit > 0
          ? `${rows.length} veld(en) ontdekt — ${suggestedHit} voorgevinkt uit AI-suggestie.`
          : `${rows.length} veld(en) ontdekt.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [activeTable, resetFeedback, suggestedFieldKeys, relationForm.detailSourceEntity]);

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

  // Laadt nav-property-kandidaten (#C) voor de detail-relatie-picker.
  const loadRelationOptions = useCallback(async (tableId) => {
    if (!tableId) return;
    setRelationOptionsLoading(true);
    try {
      const { relations } = await listRelations(tableId);
      setRelationOptions(Array.isArray(relations) ? relations : []);
    } catch (err) {
      // Kandidaten zijn een hulpmiddel; bij fout blijft handmatige invoer mogelijk.
      setRelationOptions([]);
      setError(err.message);
    } finally {
      setRelationOptionsLoading(false);
    }
  }, []);

  // Laad de kandidaten bij binnenkomst in stap 4 (eenmalig per tabel).
  useEffect(() => {
    if (stepIndex === 3 && activeTable && relationOptions.length === 0) {
      loadRelationOptions(activeTable.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, activeTable]);

  // "AI stelt relatie voor" (#C): vult detailSourceEntity + detailKeyFields voor.
  const handleSuggestRelation = useCallback(async () => {
    if (!activeTable) return;
    setRelationSuggestBusy(true);
    resetFeedback();
    setRelationSuggestReason('');
    try {
      const res = await suggestRelation(activeTable.id);
      setRelationSuggestAvailable(true);
      const s = res.suggestion || {};
      setRelationForm((p) => ({
        ...p,
        detailSourceEntity: s.detailSourceEntity || p.detailSourceEntity,
        kind: s.kind || p.kind,
        detailKeyFields: Array.isArray(s.detailKeyFields)
          ? s.detailKeyFields.join(', ')
          : (s.detailKeyFields || p.detailKeyFields),
      }));
      setRelationSuggestReason(s.reason || '');
      setFeedback('AI-relatie voorgesteld — controleer de velden en sla op.');
    } catch (err) {
      if (err.status === 503 && err.data?.code === 'AI_NOT_CONFIGURED') {
        setRelationSuggestAvailable(false);
        setError('AI-assistent is niet geconfigureerd (beheerder moet ANTHROPIC_API_KEY instellen).');
      } else {
        setError(err.message || 'AI-relatiesuggestie mislukt.');
      }
    } finally {
      setRelationSuggestBusy(false);
    }
  }, [activeTable, resetFeedback]);

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

          {/* AI-authoring-assistent: beschrijf wat je zoekt → suggestie. */}
          {assistAvailable !== false && (
            <div className={styles.assistPanel}>
              <div className={styles.spread}>
                <Text weight="semibold">AI-assistent — beschrijf wat je zoekt</Text>
                <Sparkle24Regular color={tokens.colorBrandForeground1} />
              </div>
              <Text className={styles.hint} block>
                Bijv. &quot;inkooporders met leverancier, bedrag en leverdatum&quot;. De assistent stelt
                een entiteit en velden voor; met &quot;Overnemen&quot; vul je de picker en velden voor.
              </Text>
              <Field>
                <Textarea
                  value={assistPrompt}
                  onChange={(_, d) => setAssistPrompt(d.value)}
                  placeholder="Beschrijf de tabel die je nodig hebt..."
                  resize="vertical"
                  disabled={assistBusy}
                  aria-label="Beschrijf wat je zoekt"
                />
              </Field>
              <div className={styles.actions}>
                <Button
                  appearance="primary"
                  icon={assistBusy ? <Spinner size="tiny" /> : <Sparkle24Regular />}
                  onClick={handleAssist}
                  disabled={assistBusy || !assistPrompt.trim() || !selectedSourceId}
                >
                  {assistBusy ? 'AI denkt na...' : 'AI-suggestie'}
                </Button>
                {assistError && <Text className={styles.error}>{assistError}</Text>}
              </div>

              {assistSuggestion && (
                <div className={styles.assistResult}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Voorgestelde entiteit</span>
                    <Text weight="semibold">{assistSuggestion.entitySet || assistSuggestion.sourceEntity}</Text>
                  </div>
                  {assistSuggestion.sourceEntity && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>source_entity</span>
                      <span className={styles.mono}>{assistSuggestion.sourceEntity}</span>
                    </div>
                  )}
                  {assistSuggestion.reason && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Reden</span>
                      <Text className={styles.hint}>{assistSuggestion.reason}</Text>
                    </div>
                  )}
                  {(assistSuggestion.fields || []).length > 0 && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Voorgestelde velden</span>
                      <span className={styles.chips}>
                        {assistSuggestion.fields.map((f) => (
                          <Badge key={`${f.scope || 'master'}::${f.field}`} appearance="tint" color="brand">
                            {f.label || f.field}
                          </Badge>
                        ))}
                      </span>
                    </div>
                  )}
                  <div className={styles.actions}>
                    <Button appearance="secondary" icon={<CheckmarkCircle24Regular />} onClick={handleAdoptSuggestion}>
                      Overnemen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.section}>
            <Text weight="semibold" className={styles.sectionTitle}>Nieuwe tabel aanmaken</Text>
            <Field label="Label" required>
              <Input
                value={newTableForm.label}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, label: d.value }))}
                placeholder="Bijv. Inkooporders"
              />
            </Field>
            <Field
              label="Bron-entiteit zoeken"
              hint={
                entityMeta.truncated
                  ? `Toont eerste ${entityOptions.length} van ${entityMeta.total} — verfijn je zoekopdracht.`
                  : 'Typ om te zoeken in de bron-entiteiten (server-side).'
              }
            >
              <Combobox
                freeform
                value={entityQuery}
                onChange={(e) => setEntityQuery(e.target.value)}
                onOptionSelect={handleEntitySelect}
                placeholder="Typ om te zoeken, bijv. PurchaseOrder"
                aria-label="Bron-entiteit zoeken"
                expandIcon={entityLoading ? <Spinner size="tiny" /> : <Search24Regular />}
              >
                {entityQuery.trim().length === 0 ? (
                  <Option key="__hint" text="" disabled>Typ om te zoeken…</Option>
                ) : entityLoading ? (
                  <Option key="__loading" text="" disabled>Zoeken…</Option>
                ) : entityOptions.length === 0 ? (
                  <Option key="__empty" text="" disabled>Geen entiteiten gevonden.</Option>
                ) : (
                  entityOptions.map((opt) => (
                    <Option key={opt.sourceEntity} value={opt.sourceEntity} text={opt.name}>
                      <span className={styles.comboOption}>
                        <span>{opt.name}</span>
                        {opt.entityType && <span className={styles.comboOptionSub}>{opt.entityType}</span>}
                      </span>
                    </Option>
                  ))
                )}
              </Combobox>
            </Field>
            <Field
              label="Bron-entiteit (source_entity)"
              required
              hint="Gevuld door de picker of AI, of typ hier zelf letterlijk een pad."
            >
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
          <div className={styles.spread}>
            <Text weight="semibold" className={styles.sectionTitle}>Stap 4 — Detail-relatie (optioneel)</Text>
            {relationSuggestAvailable !== false && (
              <Button
                appearance="secondary"
                icon={relationSuggestBusy ? <Spinner size="tiny" /> : <Sparkle24Regular />}
                onClick={handleSuggestRelation}
                disabled={relationSuggestBusy || busy}
              >
                {relationSuggestBusy ? 'AI denkt na...' : 'AI stelt relatie voor'}
              </Button>
            )}
          </div>
          <Text className={styles.hint} block>
            Koppel een detail-entiteit (regels) aan deze master-tabel. Kies een nav-property
            hieronder of laat leeg als er geen detail is. Kandidaten met een collectie-badge
            zijn de logische detail-relaties.
          </Text>

          {/* Nav-property-picker uit GET /tables/:id/relations (#C). */}
          <Field
            label="Detail-relatie (nav-property)"
            hint={
              relationOptionsLoading
                ? 'Kandidaten laden…'
                : relationOptions.length
                  ? 'Kies een navigatie-eigenschap; collectie-relaties leveren detailregels.'
                  : 'Geen kandidaten gevonden — typ hieronder handmatig een detail-entiteit.'
            }
          >
            <Combobox
              value={relationForm.detailSourceEntity}
              selectedOptions={relationForm.detailSourceEntity ? [relationForm.detailSourceEntity] : []}
              onOptionSelect={(_, d) =>
                setRelationForm((p) => ({ ...p, detailSourceEntity: d.optionValue || '' }))}
              placeholder="Kies een nav-property"
              aria-label="Detail-relatie (nav-property)"
              disabled={relationOptionsLoading}
              expandIcon={relationOptionsLoading ? <Spinner size="tiny" /> : undefined}
            >
              {relationOptions.length === 0 ? (
                <Option key="__none" text="" disabled>Geen kandidaten beschikbaar.</Option>
              ) : (
                relationOptions.map((rel) => (
                  <Option key={rel.name} value={rel.name} text={rel.name}>
                    <span className={styles.comboOption}>
                      <span>
                        {rel.name}
                        {rel.isCollection ? (
                          <Badge appearance="tint" color="brand" size="small" style={{ marginLeft: '6px' }}>
                            collectie
                          </Badge>
                        ) : null}
                      </span>
                      {rel.targetEntityType && (
                        <span className={styles.comboOptionSub}>{rel.targetEntityType}</span>
                      )}
                    </span>
                  </Option>
                ))
              )}
            </Combobox>
          </Field>

          {/* Handmatige fallback: letterlijk een detail-entiteit/nav-property typen. */}
          <Field
            label="Detail-entiteit (detailSourceEntity)"
            hint="Gevuld door de picker of AI, of typ hier zelf een nav-property/pad."
          >
            <Input
              value={relationForm.detailSourceEntity}
              onChange={(_, d) => setRelationForm((p) => ({ ...p, detailSourceEntity: d.value }))}
              placeholder="PurchaseOrderLines of /data/PurchaseOrderLinesV2"
            />
          </Field>

          {relationSuggestReason && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>AI-reden</span>
              <Text className={styles.hint}>{relationSuggestReason}</Text>
            </div>
          )}

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
          <Text className={styles.hint} block>
            Tip: heb je hier een detail-entiteit gekozen? Ga terug naar stap 3 en klik
            "Opnieuw ontdekken" om de detail-velden te cureren.
          </Text>
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
          {/* Fix #F: de tekst klopt nu met de nieuwe viewer + het dynamische menu. */}
          <Text className={styles.hint} block>
            De tabel is opgeslagen in <strong>dbo.tb_tables</strong>. Actieve tabellen verschijnen
            automatisch onder "Tabellen" in het zijmenu en zijn te bekijken via{' '}
            <span className={styles.mono}>/tables/{activeTable?.key || '<key>'}</span>.
          </Text>
          {/* "Tabel bekijken" alleen tonen voor publiceerbare (actieve) tabellen met een key. */}
          {activeTable?.key && activeTable?.isActive ? (
            <div className={styles.actions}>
              <Button
                as={RouterLink}
                to={`/tables/${activeTable.key}`}
                appearance="primary"
                icon={<Open24Regular />}
              >
                Tabel bekijken
              </Button>
            </div>
          ) : activeTable ? (
            <Text className={styles.hint} block>
              Deze tabel is (nog) niet actief en verschijnt daarom nog niet in de app.
            </Text>
          ) : null}
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
                {r.sample != null && String(r.sample).trim() !== '' && (
                  <span className={styles.sample} title={String(r.sample)}>
                    bv. {truncateSample(r.sample)}
                  </span>
                )}
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
