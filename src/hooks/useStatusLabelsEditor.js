import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_COLOR_PALETTE, normalizeStatusOptions } from '../utils/statusColumnUtils';
import { useAppToast } from './useAppToast';

function createDraftOptions(options) {
  return normalizeStatusOptions(options).map((option) => ({ ...option }));
}

/**
 * State + handlers voor de status-cel: waarde selecteren, labels bewerken (toevoegen /
 * hernoemen / kleur wijzigen / verwijderen) en — als een verwijderd label nog in gebruik is —
 * de reassign-conflictstap (kies per getroffen item een vervangend label of "leegmaken").
 *
 * Elke label-wijziging (toevoegen, verwijderen, hernoemen, kleur) wordt optimistisch toegepast:
 * de draft wordt direct bijgewerkt en de wijziging wordt op de achtergrond opgeslagen — er is
 * geen aparte "Apply"-stap. Bij een echte fout wordt de draft teruggedraaid naar de laatst
 * bevestigde staat en verschijnt een foutmelding; bij een 409-conflict (label nog in gebruik)
 * schakelt de UI naar de reassign-stap.
 *
 * Input: huidige cel-waarde, statuslabels van de kolom, save/update-callbacks, admin-rechten.
 * Output: normalizedOptions + drie gegroepeerde API's (selection, editor, conflict) zodat de
 * view (StatusCell) alleen rendert en geen eigen state hoeft te houden.
 *
 * @param {object} params
 * @param {string} params.value - huidige cel-waarde (statuslabel of leeg)
 * @param {Array} params.options - statuslabels van de kolom ({ id, label, color }[])
 * @param {(value: string) => Promise<void>} params.onSave - cel-waarde opslaan
 * @param {(options: Array, statusReassignments?: Object<string,string>) => Promise<void>} params.onUpdateOptions
 * @param {boolean} params.isAdmin
 */
export function useStatusLabelsEditor({ value, options, onSave, onUpdateOptions, isAdmin }) {
  const { notifyError } = useAppToast();
  const normalizedOptions = useMemo(() => normalizeStatusOptions(options), [options]);
  const currentLabel = useMemo(() => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const match = normalizedOptions.find((option) => option.label === text || option.id === text);
    return match?.label || '';
  }, [value, normalizedOptions]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('select'); // select | edit | conflict
  const [saving, setSaving] = useState(false);
  const [draftOptions, setDraftOptions] = useState(() => createDraftOptions(normalizedOptions));
  const [labelDrafts, setLabelDrafts] = useState({}); // { [optionId]: getypte tekst vóór commit }
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(STATUS_COLOR_PALETTE[1]);
  const [optionsSaving, setOptionsSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [reassignChoices, setReassignChoices] = useState({});
  const [pendingCleanedOptions, setPendingCleanedOptions] = useState(null);

  // normalizedOptions is een afgeleide waarde (nieuwe array-referentie zodra `options` verandert
  // of zelfs — bij een niet-gememoized caller — bij elke render). Via een ref losgekoppeld van de
  // effect-dependencies houden we resetEditorState blijvend stabiel, zodat de reset-effect nooit
  // op elke render opnieuw afgaat (dat zou anders een render-loop kunnen veroorzaken).
  const normalizedOptionsRef = useRef(normalizedOptions);
  normalizedOptionsRef.current = normalizedOptions;

  // Laatst bevestigde (backend-opgeslagen) staat — gebruikt om een mislukte optimistische
  // wijziging terug te draaien zonder de rest van de nog niet opgeslagen draft te verliezen.
  const lastAppliedOptionsRef = useRef(createDraftOptions(normalizedOptions));
  const persistRequestRef = useRef(0);

  const resetEditorState = useCallback(() => {
    const snapshot = createDraftOptions(normalizedOptionsRef.current);
    setMode('select');
    setDraftOptions(snapshot);
    lastAppliedOptionsRef.current = snapshot;
    setLabelDrafts({});
    setNewLabel('');
    setNewColor(STATUS_COLOR_PALETTE[1]);
    setConflicts([]);
    setReassignChoices({});
    setPendingCleanedOptions(null);
  }, []);

  useEffect(() => {
    if (!open) resetEditorState();
  }, [open, resetEditorState]);

  const handleSelect = useCallback(async (nextValue) => {
    if (nextValue === currentLabel) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextValue);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, [currentLabel, onSave]);

  // Voert de daadwerkelijke opslag uit en meldt terug of dit gelukt is, of — bij een conflict —
  // welke labels nog in gebruik zijn. Doet zelf geen UI-afhandeling (rollback/toast/mode), dat
  // gebeurt in persistDraft/handleConfirmConflict zodat beide dezelfde opslaglogica delen.
  const runUpdate = useCallback(async (nextOptions, statusReassignments) => {
    if (!isAdmin || typeof onUpdateOptions !== 'function') {
      return { ok: false, conflict: false, error: new Error('Not allowed') };
    }
    const requestId = persistRequestRef.current + 1;
    persistRequestRef.current = requestId;
    setOptionsSaving(true);
    try {
      await onUpdateOptions(nextOptions, statusReassignments);
      if (persistRequestRef.current === requestId) {
        lastAppliedOptionsRef.current = nextOptions;
        setOptionsSaving(false);
      }
      return { ok: true };
    } catch (error) {
      if (persistRequestRef.current !== requestId) return { ok: true }; // ingehaald door een nieuwere wijziging
      setOptionsSaving(false);
      if (error?.status === 409 && error?.data?.code === 'STATUS_LABELS_IN_USE') {
        return { ok: false, conflict: true, details: Array.isArray(error.data.details) ? error.data.details : [] };
      }
      return { ok: false, conflict: false, error };
    }
  }, [isAdmin, onUpdateOptions]);

  // Optimistische opslag voor toevoegen/verwijderen/hernoemen/kleur: de draft is door de caller
  // al bijgewerkt vóórdat dit wordt aangeroepen. Bij succes blijft die staat staan; bij een echte
  // fout draait dit terug naar de laatst bevestigde staat; bij een conflict schakelt dit naar de
  // reassign-stap.
  const persistDraft = useCallback(async (nextOptions) => {
    const result = await runUpdate(nextOptions, undefined);
    if (result.ok) return;
    if (result.conflict) {
      setDraftOptions(lastAppliedOptionsRef.current);
      setConflicts(result.details);
      setReassignChoices(result.details.reduce((acc, item) => ({ ...acc, [item.label]: '' }), {}));
      setPendingCleanedOptions(nextOptions);
      setMode('conflict');
    } else {
      setDraftOptions(lastAppliedOptionsRef.current);
      notifyError(result.error?.message || 'Updating status labels failed.');
    }
  }, [notifyError, runUpdate]);

  const handleAddLabel = useCallback(() => {
    const label = newLabel.trim();
    if (!label) return undefined;
    const duplicate = draftOptions.some(
      (option) => option.label.trim().toLowerCase() === label.toLowerCase(),
    );
    if (duplicate) {
      notifyError('This label already exists.');
      return undefined;
    }
    const next = [...draftOptions, { id: `status_${Date.now()}`, label, color: newColor }];
    setDraftOptions(next);
    setNewLabel('');
    setNewColor(STATUS_COLOR_PALETTE[(draftOptions.length + 1) % STATUS_COLOR_PALETTE.length]);
    return persistDraft(next);
  }, [draftOptions, newColor, newLabel, notifyError, persistDraft]);

  const handleRemoveDraftOption = useCallback((index) => {
    if (draftOptions.length <= 1) return undefined;
    const next = draftOptions.filter((_, entryIndex) => entryIndex !== index);
    setDraftOptions(next);
    return persistDraft(next);
  }, [draftOptions, persistDraft]);

  const handleColorChange = useCallback((index, color) => {
    const next = draftOptions.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, color } : entry
    ));
    setDraftOptions(next);
    return persistDraft(next);
  }, [draftOptions, persistDraft]);

  // Tekst wordt lokaal bijgehouden terwijl de gebruiker typt (geen request per toetsaanslag) —
  // pas bij commitLabelEdit (blur/Enter) wordt de wijziging gevalideerd en opgeslagen.
  const handleLabelInputChange = useCallback((optionId, nextText) => {
    setLabelDrafts((current) => ({ ...current, [optionId]: nextText }));
  }, []);

  const commitLabelEdit = useCallback((optionId) => {
    const typed = labelDrafts[optionId];
    if (typed === undefined) return undefined;
    setLabelDrafts((current) => {
      const { [optionId]: _omitted, ...rest } = current;
      return rest;
    });
    const trimmed = typed.trim();
    const existingIndex = draftOptions.findIndex((entry) => entry.id === optionId);
    if (existingIndex === -1) return undefined;
    const existing = draftOptions[existingIndex];
    if (!trimmed) {
      notifyError('A status label cannot be empty.');
      return undefined;
    }
    const duplicate = draftOptions.some((entry, entryIndex) => (
      entryIndex !== existingIndex && entry.label.trim().toLowerCase() === trimmed.toLowerCase()
    ));
    if (duplicate) {
      notifyError('This label already exists.');
      return undefined;
    }
    if (existing.label === trimmed) return undefined;
    const next = draftOptions.map((entry, entryIndex) => (
      entryIndex === existingIndex ? { ...entry, label: trimmed } : entry
    ));
    setDraftOptions(next);
    return persistDraft(next);
  }, [draftOptions, labelDrafts, notifyError, persistDraft]);

  const setReassignChoice = useCallback((label, target) => {
    setReassignChoices((current) => ({ ...current, [label]: target }));
  }, []);

  const handleCancelConflict = useCallback(() => {
    setMode('edit');
    setConflicts([]);
    setReassignChoices({});
    setPendingCleanedOptions(null);
  }, []);

  const handleConfirmConflict = useCallback(async () => {
    if (!pendingCleanedOptions) return;
    const result = await runUpdate(pendingCleanedOptions, reassignChoices);
    if (result.ok) {
      setDraftOptions(pendingCleanedOptions);
      setMode('edit');
      setConflicts([]);
      setReassignChoices({});
      setPendingCleanedOptions(null);
    } else if (result.conflict) {
      setConflicts(result.details);
      setReassignChoices(result.details.reduce((acc, item) => ({ ...acc, [item.label]: '' }), {}));
    } else {
      notifyError(result.error?.message || 'Updating status labels failed.');
    }
  }, [notifyError, pendingCleanedOptions, reassignChoices, runUpdate]);

  return {
    normalizedOptions,
    currentLabel,
    mode,
    setMode,
    selection: { open, setOpen, saving, handleSelect },
    editor: {
      draftOptions,
      labelDrafts,
      newLabel,
      setNewLabel,
      newColor,
      setNewColor,
      optionsSaving,
      handleAddLabel,
      handleRemoveDraftOption,
      handleColorChange,
      handleLabelInputChange,
      commitLabelEdit,
    },
    conflict: {
      conflicts,
      remainingOptions: pendingCleanedOptions || [],
      reassignChoices,
      setReassignChoice,
      saving: optionsSaving,
      handleCancelConflict,
      handleConfirmConflict,
    },
  };
}
