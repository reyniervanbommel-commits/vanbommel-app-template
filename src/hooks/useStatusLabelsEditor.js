import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_COLOR_PALETTE, normalizeStatusOptions } from '../utils/statusColumnUtils';

function createDraftOptions(options) {
  return normalizeStatusOptions(options).map((option) => ({ ...option }));
}

/**
 * State + handlers voor de status-cel: waarde selecteren, labels bewerken (toevoegen /
 * hernoemen / verwijderen) en — als een verwijderd label nog in gebruik is — de reassign-
 * conflictstap (kies per getroffen item een vervangend label of "leegmaken").
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

  const resetEditorState = useCallback(() => {
    setMode('select');
    setDraftOptions(createDraftOptions(normalizedOptionsRef.current));
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

  const submitOptions = useCallback(async (cleanedOptions, statusReassignments) => {
    setOptionsSaving(true);
    try {
      await onUpdateOptions(cleanedOptions, statusReassignments);
      setMode('select');
      setOpen(false);
      setConflicts([]);
      setReassignChoices({});
      setPendingCleanedOptions(null);
    } catch (error) {
      // Backend weigert het verwijderen van een label dat nog in gebruik is (409). De details
      // (welke labels, hoeveel items) worden gebruikt om de reassign-stap te tonen i.p.v. de
      // wijziging gewoon te laten mislukken.
      if (error?.status === 409 && error?.data?.code === 'STATUS_LABELS_IN_USE') {
        const details = Array.isArray(error.data.details) ? error.data.details : [];
        setConflicts(details);
        setReassignChoices(details.reduce((acc, item) => ({ ...acc, [item.label]: '' }), {}));
        setPendingCleanedOptions(cleanedOptions);
        setMode('conflict');
      } else {
        throw error;
      }
    } finally {
      setOptionsSaving(false);
    }
  }, [onUpdateOptions]);

  const handleApplyOptions = useCallback(async () => {
    if (!isAdmin || typeof onUpdateOptions !== 'function') return;
    const cleanedOptions = draftOptions
      .map((option) => ({ ...option, label: String(option.label || '').trim() }))
      .filter((option) => option.label);
    if (!cleanedOptions.length) return;
    await submitOptions(cleanedOptions, undefined);
  }, [draftOptions, isAdmin, onUpdateOptions, submitOptions]);

  const handleRemoveDraftOption = useCallback((index) => {
    setDraftOptions((current) => (current.length > 1 ? current.filter((_, entryIndex) => entryIndex !== index) : current));
  }, []);

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
    await submitOptions(pendingCleanedOptions, reassignChoices);
  }, [pendingCleanedOptions, reassignChoices, submitOptions]);

  return {
    normalizedOptions,
    currentLabel,
    mode,
    setMode,
    selection: { open, setOpen, saving, handleSelect },
    editor: {
      draftOptions,
      setDraftOptions,
      newLabel,
      setNewLabel,
      newColor,
      setNewColor,
      optionsSaving,
      handleApplyOptions,
      handleRemoveDraftOption,
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
