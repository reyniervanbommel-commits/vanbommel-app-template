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
  Dismiss24Regular,
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
  discoverFilterFields,
  suggestFilter,
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
  root: { maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  // Formulierstappen (bron/tabel aanmaken/relatie) lezen prettiger op een beperkte breedte;
  // alleen de veld-tabel (stap 3) mag de volle breedte van `root` gebruiken.
  formSection: { maxWidth: '760px' },
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
  // --- Stap 3: veld-tabel ---------------------------------------------------
  // Eén header-rij met kolomtitels i.p.v. per rij herhaalde labels; compacte rijen zodat
  // lange veldenlijsten scanbaar blijven. Horizontaal scrollbaar op smalle schermen.
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('10px'),
    flexWrap: 'wrap',
  },
  grow: { flexGrow: 1 },
  fieldTableWrap: {
    ...shorthands.overflow('auto'),
    ...shorthands.borderRadius('8px'),
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  fieldTable: { minWidth: '940px', display: 'flex', flexDirection: 'column' },
  fieldScroll: { maxHeight: '460px', ...shorthands.overflow('hidden', 'auto') },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: '40px minmax(210px, 1.5fr) 140px minmax(280px, 2.2fr) 84px 64px 76px',
    alignItems: 'center',
    ...shorthands.gap('10px'),
    ...shorthands.padding('7px', '12px'),
    // Grid-cellen mogen krimpen tot onder hun content-minimum; anders duwt bv. de Dropdown
    // (Fluent-default min-width 250px) over de buurkolom heen.
    '& > *': { minWidth: 0 },
  },
  // Fluent Dropdown/Input hebben een eigen min-width; forceer ze binnen hun kolom.
  cellControl: { minWidth: 0, width: '100%', maxWidth: '100%' },
  fieldHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  colCenter: { display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' },
  fieldRowLine: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  fieldRowDim: { backgroundColor: tokens.colorNeutralBackground2 },
  // Veld-cel: label en technische naam náást elkaar op één regel (niet gestapeld).
  fieldMeta: { display: 'flex', flexDirection: 'row', alignItems: 'baseline', ...shorthands.gap('8px'), minWidth: 0 },
  // Label (bewerkbaar of statisch): mag groeien/krimpen maar houdt voorrang op de technische naam.
  labelCell: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: '110px' },
  fieldName: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    flexGrow: 0,
    flexShrink: 2,
    minWidth: 0,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldLabelStatic: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Voorbeeldwaarden als kleine, goed leesbare chips op één regel; overloop wordt geklikt (title = volledig).
  sampleChips: { display: 'flex', flexWrap: 'nowrap', ...shorthands.gap('4px'), minWidth: 0, ...shorthands.overflow('hidden') },
  sampleChip: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    lineHeight: '16px',
    ...shorthands.padding('1px', '6px'),
    ...shorthands.borderRadius('4px'),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    flexShrink: 0,
    maxWidth: '170px',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sampleEmpty: { color: tokens.colorNeutralForeground4, fontSize: tokens.fontSizeBase100, fontStyle: 'italic' },
  summaryGrid: { display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  summaryRow: { display: 'flex', ...shorthands.gap('8px'), alignItems: 'center', flexWrap: 'wrap' },
  summaryLabel: { color: tokens.colorNeutralForeground3, minWidth: '190px', fontSize: tokens.fontSizeBase200 },
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
  // --- Standaardfilter-builder ---------------------------------------------
  filterBuilder: { display: 'flex', flexDirection: 'column', ...shorthands.gap('10px') },
  filterToolbar: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  filterGrow: { flexGrow: 1 },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '68px minmax(150px, 1.6fr) 128px minmax(140px, 1.4fr) 32px',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  filterJoinCell: { display: 'flex', justifyContent: 'center' },
  filterPreview: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('8px', '10px'),
    wordBreak: 'break-all',
  },
  filterEmpty: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, fontStyle: 'italic' },
  filterAiRow: { display: 'flex', ...shorthands.gap('8px'), alignItems: 'flex-start', flexWrap: 'wrap' },
  filterAiInput: { flexGrow: 1, minWidth: '220px' },
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

// OData-operatoren met NL-labels voor de filter-builder-dropdown.
const OPERATOR_LABELS = {
  eq: 'is', ne: 'is niet', gt: 'groter dan', ge: 'groter of gelijk',
  lt: 'kleiner dan', le: 'kleiner of gelijk', contains: 'bevat', startswith: 'begint met',
};
const BOOL_OPTIONS = [{ value: 'true', label: 'Ja' }, { value: 'false', label: 'Nee' }];

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
    // korte voorbeeldwaarden uit echte data (tot enkele distinct). Nieuwe backend levert `samples`;
    // val faalt-veilig terug op het oude enkelvoudige `sample`, of een lege lijst.
    samples: Array.isArray(f.samples)
      ? f.samples
      : (f.sample != null && String(f.sample).trim() !== '' ? [f.sample] : []),
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
    defaultFilter: '',
    maxRows: '',
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
    const keyFields = newTableForm.keyFields
      .split(',').map((s) => s.trim()).filter(Boolean);
    if (!keyFields.length) {
      // Sleutelvelden zijn essentieel: ze vormen de unieke rij-sleutel (zie hint). Zonder unieke sleutel
      // overschrijven rijen elkaar in de cache en verdwijnt data.
      setError('Geef minstens één sleutelveld op dat een rij uniek identificeert (bv. dataAreaId, SalesOrderNumber, LineNumber).');
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const maxRowsNum = Number.parseInt(newTableForm.maxRows, 10);
      const { table } = await createTable({
        label,
        sourceId: selectedSourceId,
        sourceEntity,
        keyFields: keyFields.length ? keyFields : undefined,
        defaultFilter: newTableForm.defaultFilter.trim() || undefined,
        maxRows: Number.isFinite(maxRowsNum) && maxRowsNum > 0 ? maxRowsNum : undefined,
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
      // Geen bruikbare entiteit (bv. AI vond niets passends): toon de reden/waarschuwing i.p.v. iets
      // ongeldigs voor te vullen. De admin verfijnt de omschrijving of gebruikt de picker.
      setError(assistSuggestion.warning || assistSuggestion.reason
        || 'De AI kon geen bron-entiteit bepalen; verfijn je omschrijving of gebruik de picker.');
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

  // Bulk cureren via de "selecteer alles"-checkbox in de tabelkop. Werkt op de doorgegeven
  // (gefilterde) veldnamen zodat een actieve zoekopdracht de selectie respecteert.
  const bulkCurate = useCallback((scope, fieldNames, curated) => {
    const names = new Set(fieldNames);
    const setter = scope === 'master' ? setMasterFields : setDetailFields;
    setter((prev) => prev.map((r) => (names.has(r.field) ? { ...r, curated } : r)));
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

          <div className={[styles.section, styles.formSection].join(' ')}>
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
            <Field
              label="Sleutelvelden (komma-gescheiden)"
              required
              hint="Velden die samen elke rij UNIEK identificeren — vormen de rij-sleutel. Bij een niet-unieke sleutel overschrijven rijen elkaar en verdwijnt data. Bijv. voor orderregels: dataAreaId, SalesOrderNumber, LineNumber."
            >
              <Input
                value={newTableForm.keyFields}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, keyFields: d.value }))}
                placeholder="PurchaseOrderNumber"
              />
            </Field>
            <Field
              label="Standaardfilter (optioneel)"
              hint="OData-$filter dat bij het ophalen wordt toegepast. Stel samen met de keuzelijsten, of laat de AI het uit een omschrijving genereren."
            >
              <FilterBuilder
                styles={styles}
                sourceId={selectedSourceId}
                sourceEntity={newTableForm.sourceEntity}
                value={newTableForm.defaultFilter}
                onChange={(v) => setNewTableForm((p) => ({ ...p, defaultFilter: v }))}
              />
            </Field>
            <Field label="Max. rijen (optioneel)" hint="Begrenst hoeveel rijen uit de bron worden opgehaald. Leeg = standaard (2000).">
              <Input
                type="number"
                value={newTableForm.maxRows}
                onChange={(_, d) => setNewTableForm((p) => ({ ...p, maxRows: d.value }))}
                placeholder="bijv. 25"
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
              Vink de velden aan die je wilt tonen. Reeds gecureerde velden zijn voorgevinkt. De kolom
              <strong> Voorbeelden</strong> toont echte waarden uit de bron zodat je het veld herkent.
              Velden zonder data in de bron worden verborgen — toon ze eventueel via de knop bij de sectie.
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
            onBulkCurate={bulkCurate}
          />
          <FieldSection
            styles={styles}
            title="Detail-velden"
            scope="detail"
            rows={detailFields}
            search={detailSearch}
            onSearch={setDetailSearch}
            onUpdate={updateField}
            onBulkCurate={bulkCurate}
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
        <div className={[styles.section, styles.formSection].join(' ')}>
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
                <span className={styles.summaryLabel}>Standaardfilter</span>
                <span className={styles.mono}>{activeTable.defaultFilter || 'Geen'}</span>
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

// ---------------------------------------------------------------------------
// Standaardfilter-builder: Veld → Operator → Waarde-rijen die een OData-$filter samenstellen, met enum-
// keuzelijsten uit $metadata en een AI-veld (NL → filter). Spiegelt de server-side opbouw
// (TableAssistService.buildClauseExpression) zodat de gegenereerde string identiek en geldig is.
// ---------------------------------------------------------------------------
function escapeODataString(v) {
  return String(v == null ? '' : v).replace(/'/g, "''");
}

// Bouw de OData-expressie voor één clausule tegen een bekend veld. null = ongeldig (wordt weggelaten).
function buildFilterExpression(field, operator, rawValue) {
  if (!field || !Array.isArray(field.operators) || !field.operators.includes(operator)) return null;
  const val = rawValue == null ? '' : String(rawValue).trim();
  if (field.dataType === 'select') {
    const member = (field.enumMembers || []).find((m) => m.name === val || m.value === val);
    return member ? `${field.field} ${operator} ${member.value}` : null;
  }
  if (field.dataType === 'boolean') {
    const b = /^(true|1|ja|yes)$/i.test(val) ? 'true' : /^(false|0|nee|no)$/i.test(val) ? 'false' : null;
    return b === null ? null : `${field.field} ${operator} ${b}`;
  }
  if (!val) return null;
  if (field.dataType === 'number') {
    return /^-?\d+(\.\d+)?$/.test(val) ? `${field.field} ${operator} ${val}` : null;
  }
  if (field.dataType === 'date') {
    let dt = val;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) dt += 'T00:00:00Z';
    return /^\d{4}-\d{2}-\d{2}T/.test(dt) ? `${field.field} ${operator} ${dt}` : null;
  }
  if (operator === 'contains' || operator === 'startswith') {
    return `${operator}(${field.field},'${escapeODataString(val)}')`;
  }
  return `${field.field} ${operator} '${escapeODataString(val)}'`;
}

// Stel de volledige OData-$filter samen uit de clausules (alleen geldige tellen mee).
function composeODataFilter(clauses, byName) {
  const segments = [];
  for (const c of clauses) {
    const expr = buildFilterExpression(byName.get(c.field), c.operator, c.value);
    if (!expr) continue;
    segments.push(segments.length === 0 ? expr : `${c.join === 'or' ? 'or' : 'and'} ${expr}`);
  }
  return segments.join(' ');
}

// Standaardwaarde voor een net gekozen/gewijzigd veld (eerste enum-lid / booleaan-default / leeg).
function defaultValueForField(field) {
  if (!field) return '';
  if (field.dataType === 'select') return field.enumMembers && field.enumMembers[0] ? field.enumMembers[0].name : '';
  if (field.dataType === 'boolean') return 'true';
  return '';
}

let _filterClauseSeq = 0;
function newClause() { _filterClauseSeq += 1; return { uid: _filterClauseSeq, field: '', fieldQuery: '', operator: '', value: '', join: 'and' }; }

function FilterBuilder({ styles, sourceId, sourceEntity, value, onChange }) {
  // Bestaand (niet-leeg) filter openen we in de geavanceerde tekstweergave: we parsen OData niet terug
  // naar clausules. Leeg → builder-modus.
  const [advanced, setAdvanced] = useState(() => Boolean(value && value.trim()));
  const [clauses, setClauses] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(null);
  const [aiNote, setAiNote] = useState('');

  const byName = useMemo(() => new Map(fields.map((f) => [f.field, f])), [fields]);
  // Alleen velden mét data tonen in de picker; lege kolommen (geen enkele rij heeft een waarde) laten we
  // weg. byName houdt wél alle velden, zodat een AI-suggestie op een veld dat toevallig buiten de sample
  // viel toch oplost.
  const pickableFields = useMemo(
    () => fields.filter((f) => Array.isArray(f.samples) && f.samples.length > 0),
    [fields],
  );

  // Filtervelden ophalen zodra bron + entiteit bekend zijn (gedebounced; entiteit kan nog getypt worden).
  const entity = String(sourceEntity || '').trim();
  useEffect(() => {
    if (!sourceId || entity.length < 4) { setFields([]); return undefined; }
    let cancelled = false;
    setFieldsLoading(true);
    setFieldsError('');
    const handle = setTimeout(() => {
      discoverFilterFields(sourceId, entity)
        .then((res) => { if (!cancelled) setFields(Array.isArray(res.fields) ? res.fields : []); })
        .catch((err) => { if (!cancelled) { setFields([]); setFieldsError(err.message || 'Kon filtervelden niet laden.'); } })
        .finally(() => { if (!cancelled) setFieldsLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [sourceId, entity]);

  // Clausules muteren en het samengestelde filter meteen naar de parent doorgeven.
  const applyClauses = useCallback((next) => {
    setClauses(next);
    onChange(composeODataFilter(next, byName));
  }, [byName, onChange]);

  const addClause = useCallback(() => setClauses((prev) => [...prev, newClause()]), []);
  const removeClause = useCallback((uid) => applyClauses(clauses.filter((c) => c.uid !== uid)), [applyClauses, clauses]);
  const updateClause = useCallback((uid, patch) => {
    applyClauses(clauses.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  }, [applyClauses, clauses]);

  // Veldkeuze: zet veld + reset operator/waarde naar zinvolle defaults voor het nieuwe datatype.
  const selectField = useCallback((uid, fieldName) => {
    const field = byName.get(fieldName);
    updateClause(uid, {
      field: fieldName,
      fieldQuery: fieldName,
      operator: field && field.operators[0] ? field.operators[0] : 'eq',
      value: defaultValueForField(field),
    });
  }, [byName, updateClause]);

  const runAi = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || !sourceId || !entity) return;
    setAiBusy(true); setAiError(''); setAiNote('');
    try {
      const res = await suggestFilter(sourceId, { entity, prompt });
      const s = res.suggestion || {};
      // De backend levert gevalideerde clausules (field/operator/value); laad ze als builder-rijen.
      const loaded = (s.clauses || []).map((c) => ({
        ...newClause(), field: c.field, fieldQuery: c.field, operator: c.operator, value: c.value, join: c.join || 'and',
      }));
      setAdvanced(false);
      applyClauses(loaded);
      setAiNote([s.reason, s.warning].filter(Boolean).join(' — '));
    } catch (err) {
      if (err.status === 503 && err.data && err.data.code === 'AI_NOT_CONFIGURED') {
        setAiAvailable(false);
      } else {
        setAiError(err.message || 'AI-suggestie mislukt.');
      }
    } finally {
      setAiBusy(false);
    }
  }, [aiPrompt, sourceId, entity, applyClauses]);

  const preview = value || '';

  return (
    <div className={styles.filterBuilder}>
      <div className={styles.filterToolbar}>
        <Checkbox
          label="Geavanceerd (ruwe OData)"
          checked={advanced}
          onChange={(_, d) => setAdvanced(!!d.checked)}
        />
        <span className={styles.filterGrow} />
        {fieldsLoading && <Spinner size="tiny" label="Velden laden…" />}
      </div>

      {advanced ? (
        <Textarea
          value={value}
          onChange={(_, d) => onChange(d.value)}
          placeholder="PurchaseOrderStatus eq Microsoft.Dynamics.DataEntities.PurchStatus'Backorder'"
          resize="vertical"
        />
      ) : (
        <>
          {fieldsError && <Text className={styles.error}>{fieldsError}</Text>}
          {!fieldsError && entity.length < 4 && (
            <Text className={styles.filterEmpty}>Kies eerst een bron-entiteit; daarna verschijnen de filterbare velden.</Text>
          )}
          {!fieldsError && !fieldsLoading && entity.length >= 4 && fields.length > 0 && pickableFields.length === 0 && (
            <Text className={styles.filterEmpty}>Geen kolommen met data gevonden in de steekproef — gebruik de geavanceerde modus voor een handmatig filter.</Text>
          )}

          {clauses.map((c, i) => {
            const field = byName.get(c.field);
            // Zoekterm alleen toepassen als er getypt wordt (en niet gelijk aan het al gekozen veld), zodat
            // de lijst na een keuze bij heropenen weer volledig is en tijdens typen filtert.
            const q = c.fieldQuery && c.fieldQuery !== c.field ? c.fieldQuery.toLowerCase() : '';
            const options = q
              ? pickableFields.filter((f) => (`${f.field} ${f.label}`).toLowerCase().includes(q))
              : pickableFields;
            return (
              <div key={c.uid} className={styles.filterRow}>
                <div className={styles.filterJoinCell}>
                  {i === 0 ? (
                    <Text className={styles.filterEmpty}>waar</Text>
                  ) : (
                    <Dropdown
                      size="small"
                      value={c.join === 'or' ? 'of' : 'en'}
                      selectedOptions={[c.join || 'and']}
                      onOptionSelect={(_, d) => updateClause(c.uid, { join: d.optionValue })}
                      aria-label="Verbinding"
                    >
                      <Option value="and">en</Option>
                      <Option value="or">of</Option>
                    </Dropdown>
                  )}
                </div>

                <Combobox
                  freeform
                  size="small"
                  placeholder="Kies veld"
                  value={c.fieldQuery ?? ''}
                  selectedOptions={c.field ? [c.field] : []}
                  onChange={(e) => updateClause(c.uid, { fieldQuery: e.target.value })}
                  onOptionSelect={(_, d) => selectField(c.uid, d.optionValue)}
                  aria-label="Veld"
                >
                  {options.length === 0 ? (
                    <Option key="__none" text="" disabled>Geen veld met data gevonden.</Option>
                  ) : (
                    options.slice(0, 50).map((f) => (
                      <Option key={f.field} value={f.field} text={f.field}>
                        <span className={styles.comboOption}>
                          <span>{f.field}</span>
                          <span className={styles.comboOptionSub}>
                            {DATA_TYPE_LABELS[f.dataType] || f.dataType}
                            {f.samples && f.samples.length > 0
                              ? ` · bv. ${f.samples.slice(0, 3).map((s) => truncateSample(s, 18)).join(', ')}`
                              : ''}
                          </span>
                        </span>
                      </Option>
                    ))
                  )}
                </Combobox>

                <Dropdown
                  size="small"
                  disabled={!field}
                  value={field ? (OPERATOR_LABELS[c.operator] || c.operator) : ''}
                  selectedOptions={[c.operator]}
                  onOptionSelect={(_, d) => updateClause(c.uid, { operator: d.optionValue })}
                  aria-label="Operator"
                >
                  {(field ? field.operators : []).map((op) => (
                    <Option key={op} value={op}>{OPERATOR_LABELS[op] || op}</Option>
                  ))}
                </Dropdown>

                <FilterValueInput styles={styles} field={field} value={c.value} onValue={(v) => updateClause(c.uid, { value: v })} />

                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={() => removeClause(c.uid)}
                  aria-label="Clausule verwijderen"
                />
              </div>
            );
          })}

          <div>
            <Button size="small" appearance="secondary" icon={<Add24Regular />} onClick={addClause} disabled={!fields.length}>
              Voorwaarde toevoegen
            </Button>
          </div>

          {aiAvailable !== false && (
            <div className={styles.filterAiRow}>
              <Input
                className={styles.filterAiInput}
                size="small"
                placeholder='Beschrijf het filter, bijv. "alleen open orders van dit jaar"'
                value={aiPrompt}
                onChange={(_, d) => setAiPrompt(d.value)}
                disabled={aiBusy || !fields.length}
              />
              <Button
                size="small"
                appearance="secondary"
                icon={aiBusy ? <Spinner size="tiny" /> : <Sparkle24Regular />}
                onClick={runAi}
                disabled={aiBusy || !aiPrompt.trim() || !fields.length}
              >
                {aiBusy ? 'AI denkt na…' : 'AI-filter'}
              </Button>
            </div>
          )}
          {aiError && <Text className={styles.error}>{aiError}</Text>}
          {aiNote && <Text className={styles.hint}>{aiNote}</Text>}
        </>
      )}

      {preview ? (
        <div className={styles.filterPreview} title={preview}>{preview}</div>
      ) : (
        !advanced && <Text className={styles.filterEmpty}>Geen filter — de hele (gecapte) dataset wordt opgehaald.</Text>
      )}
    </div>
  );
}

// Waarde-invoer die zich aanpast aan het datatype van het gekozen veld (keuzelijst, ja/nee, datum, tekst/getal).
function FilterValueInput({ styles, field, value, onValue }) {
  if (!field) {
    return <Input size="small" disabled placeholder="waarde" value="" aria-label="Waarde" />;
  }
  if (field.dataType === 'select') {
    const members = field.enumMembers || [];
    return (
      <Dropdown
        size="small"
        value={value || ''}
        selectedOptions={value ? [value] : []}
        onOptionSelect={(_, d) => onValue(d.optionValue)}
        aria-label="Waarde"
        placeholder="Kies waarde"
      >
        {members.map((m) => (<Option key={m.name} value={m.name}>{m.name}</Option>))}
      </Dropdown>
    );
  }
  if (field.dataType === 'boolean') {
    return (
      <Dropdown
        size="small"
        value={value === 'false' ? 'Nee' : 'Ja'}
        selectedOptions={[value === 'false' ? 'false' : 'true']}
        onOptionSelect={(_, d) => onValue(d.optionValue)}
        aria-label="Waarde"
      >
        {BOOL_OPTIONS.map((o) => (<Option key={o.value} value={o.value}>{o.label}</Option>))}
      </Dropdown>
    );
  }
  const type = field.dataType === 'date' ? 'date' : field.dataType === 'number' ? 'number' : 'text';
  return (
    <Input
      size="small"
      type={type}
      value={value || ''}
      onChange={(_, d) => onValue(d.value)}
      placeholder="waarde"
      aria-label="Waarde"
    />
  );
}

// Sub-component: één scope-sectie (master of detail) als compacte tabel met sticky header-rij,
// "selecteer alles", een teller en meerdere voorbeeldwaarden per veld.
function FieldSection({ styles, title, scope, rows, search, onSearch, onUpdate, onBulkCurate }) {
  const [showEmpty, setShowEmpty] = useState(false);

  // Velden zonder voorbeelddata verbergen (die kolommen zijn in de bron leeg → geen zinvolle keuze).
  // Al gecureerde velden blijven altijd staan. Faalt-veilig: als sampling voor de héle scope niets
  // opleverde (timeout/mislukt), toon dan alsnog alles — anders zou de lijst onbruikbaar leeg zijn.
  const anyData = useMemo(() => rows.some((r) => r.samples && r.samples.length > 0), [rows]);
  const hasData = (r) => (r.samples && r.samples.length > 0) || r.curated;
  const emptyCount = useMemo(
    () => (anyData ? rows.filter((r) => !hasData(r)).length : 0),
    [rows, anyData],
  );
  const dataRows = useMemo(
    () => (!anyData || showEmpty ? rows : rows.filter(hasData)),
    [rows, anyData, showEmpty],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dataRows;
    return dataRows.filter(
      (r) => r.field.toLowerCase().includes(q) || (r.label || '').toLowerCase().includes(q),
    );
  }, [dataRows, search]);

  const curatedCount = useMemo(() => rows.filter((r) => r.curated).length, [rows]);
  // Noemer = velden met data (of alles als sampling mislukte), zodat de teller klopt met wat zichtbaar is.
  const selectableCount = anyData ? rows.length - emptyCount : rows.length;
  const allChecked = filtered.length > 0 && filtered.every((r) => r.curated);
  const someChecked = filtered.some((r) => r.curated);
  const headerChecked = allChecked ? true : someChecked ? 'mixed' : false;
  const toggleAll = () => onBulkCurate(scope, filtered.map((r) => r.field), !allChecked);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <Text weight="semibold" className={styles.sectionTitle}>{title}</Text>
        <Badge appearance="tint" color={curatedCount ? 'brand' : 'informative'}>
          {curatedCount}/{selectableCount} gecureerd
        </Badge>
        {emptyCount > 0 && (
          <Button appearance="subtle" size="small" onClick={() => setShowEmpty((v) => !v)}>
            {showEmpty ? 'Verberg lege velden' : `Toon ${emptyCount} lege velden`}
          </Button>
        )}
        <span className={styles.grow} />
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
      ) : (
        <div className={styles.fieldTableWrap}>
          <div className={styles.fieldTable}>
            {/* Header-rij: kolomtitels één keer i.p.v. per rij. */}
            <div className={[styles.fieldGrid, styles.fieldHeader].join(' ')} role="row">
              <span className={styles.colCenter}>
                <Checkbox
                  checked={headerChecked}
                  onChange={toggleAll}
                  disabled={filtered.length === 0}
                  aria-label={`Alle ${title} selecteren`}
                />
              </span>
              <span>Veld</span>
              <span>Type</span>
              <span>Voorbeelden</span>
              <span className={styles.colCenter}>Zichtbaar</span>
              <span className={styles.colCenter}>Filter</span>
              <span className={styles.colCenter}>Sorteer</span>
            </div>

            <div className={styles.fieldScroll}>
              {filtered.length === 0 ? (
                <div className={styles.empty}>Geen resultaten voor "{search}".</div>
              ) : (
                filtered.map((r) => (
                  <div
                    key={r.field}
                    className={[styles.fieldGrid, styles.fieldRowLine, !r.curated ? styles.fieldRowDim : '']
                      .filter(Boolean).join(' ')}
                    role="row"
                  >
                    <span className={styles.colCenter}>
                      <Checkbox
                        checked={r.curated}
                        onChange={(_, d) => onUpdate(scope, r.field, { curated: !!d.checked })}
                        aria-label={`Cureer ${r.field}`}
                      />
                    </span>

                    <div className={styles.fieldMeta} title={r.field}>
                      {r.curated ? (
                        <Input
                          className={styles.labelCell}
                          appearance="underline"
                          size="small"
                          value={r.label}
                          onChange={(_, d) => onUpdate(scope, r.field, { label: d.value })}
                          aria-label={`Label voor ${r.field}`}
                        />
                      ) : (
                        <span className={[styles.labelCell, styles.fieldLabelStatic].join(' ')}>{r.label}</span>
                      )}
                      <span className={styles.fieldName}>{r.field}</span>
                    </div>

                    <Dropdown
                      className={styles.cellControl}
                      size="small"
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

                    <div
                      className={styles.sampleChips}
                      title={r.samples && r.samples.length > 0 ? r.samples.join('   •   ') : undefined}
                    >
                      {r.samples && r.samples.length > 0 ? (
                        r.samples.map((s, i) => (
                          <span key={i} className={styles.sampleChip} title={String(s)}>
                            {truncateSample(s, 20)}
                          </span>
                        ))
                      ) : (
                        <span className={styles.sampleEmpty}>geen data</span>
                      )}
                    </div>

                    <span className={styles.colCenter}>
                      <Checkbox
                        checked={r.isDefaultVisible}
                        disabled={!r.curated}
                        onChange={(_, d) => onUpdate(scope, r.field, { isDefaultVisible: !!d.checked })}
                        aria-label={`Zichtbaar: ${r.field}`}
                      />
                    </span>
                    <span className={styles.colCenter}>
                      <Checkbox
                        checked={r.filterable}
                        disabled={!r.curated}
                        onChange={(_, d) => onUpdate(scope, r.field, { filterable: !!d.checked })}
                        aria-label={`Filterbaar: ${r.field}`}
                      />
                    </span>
                    <span className={styles.colCenter}>
                      <Checkbox
                        checked={r.sortable}
                        disabled={!r.curated}
                        onChange={(_, d) => onUpdate(scope, r.field, { sortable: !!d.checked })}
                        aria-label={`Sorteerbaar: ${r.field}`}
                      />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
