import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

const BASE = '/data-links';

/**
 * Wizardstate + alle API-calls voor de "Externe koppelingen" (Excel -> hoofdtabel).
 *
 * Aannames (op basis van het API-contract in story #166):
 * - De file-upload gaat NIET via apiRequest (die stuurt JSON); we gebruiken een rauwe
 *   fetch met FormData + credentials:'include' zodat de multipart-body intact blijft.
 * - Alle overige calls zijn JSON via apiRequest.
 * - De afgeleide kolom-key defaultt naar de dataset-kolom-key (fields: { afgeleideKey: datasetColKey }).
 *
 * Output: { step, goToStep, canGoTo, mainTables, dataset, links, ... + acties }.
 */
export function useExcelLinkWizard() {
  // Stap 1..4 (1-indexed voor leesbaarheid in de UI).
  const [step, setStep] = useState(1);

  // Referentiedata.
  const [mainTables, setMainTables] = useState([]);
  const [links, setLinks] = useState([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState('');

  // Stap 1: geuploade dataset.
  const [dataset, setDataset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Stap 2: sleutelkeuze.
  const [mainTableKey, setMainTableKey] = useState('');
  const [sourceScope, setSourceScope] = useState('master');
  const [mainKeyField, setMainKeyField] = useState('');
  const [datasetKeyField, setDatasetKeyField] = useState('');

  // Stap 3: kolomkeuze. selectedColumns = Set van dataset-kolom-keys; derivedKeys = map key->afgeleide key.
  const [selectedColumns, setSelectedColumns] = useState(() => new Set());
  const [derivedKeys, setDerivedKeys] = useState({});

  // Stap 4: validatie + publiceren.
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadReference = useCallback(async () => {
    setRefError('');
    setRefLoading(true);
    try {
      const [tablesRes, linksRes] = await Promise.all([
        apiRequest(`${BASE}/main-tables`),
        apiRequest(`${BASE}/links`),
      ]);
      setMainTables(Array.isArray(tablesRes?.tables) ? tablesRes.tables : []);
      setLinks(Array.isArray(linksRes?.links) ? linksRes.links : []);
    } catch (err) {
      setRefError(err.message || 'Referentiedata laden mislukt');
    } finally {
      setRefLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReference();
  }, [loadReference]);

  // Geselecteerde hoofdtabel + de kolommen van de gekozen scope (master/detail).
  const selectedMainTable = useMemo(
    () => mainTables.find((t) => t.tableKey === mainTableKey) || null,
    [mainTables, mainTableKey],
  );
  const scopeColumns = useMemo(() => {
    if (!selectedMainTable) return [];
    return selectedMainTable.columns?.[sourceScope] || [];
  }, [selectedMainTable, sourceScope]);

  // ---- Stap 1: upload ----
  const uploadFile = useCallback(async (file, label) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('label', label || file.name);
      // Rauwe fetch: FormData mag NIET met Content-Type JSON gaan; browser zet de boundary zelf.
      const res = await fetch(`/api${BASE}/datasets`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload mislukt');
      setDataset(data.dataset || null);
      // Reset afgeleide keuzes die van een vorige dataset afhingen.
      setSelectedColumns(new Set());
      setDerivedKeys({});
      setValidation(null);
      setPublishResult(null);
    } catch (err) {
      setUploadError(err.message || 'Upload mislukt');
    } finally {
      setUploading(false);
    }
  }, []);

  // ---- Stap 3: kolomkeuze ----
  const toggleColumn = useCallback((colKey, defaultDerived) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
    setDerivedKeys((prev) => {
      if (prev[colKey]) return prev;
      return { ...prev, [colKey]: defaultDerived || colKey };
    });
  }, []);

  const setDerivedKey = useCallback((colKey, value) => {
    setDerivedKeys((prev) => ({ ...prev, [colKey]: value }));
  }, []);

  // { afgeleideKolomKey: datasetColKey } uit de selectie.
  const fieldsMap = useMemo(() => {
    const out = {};
    selectedColumns.forEach((colKey) => {
      const derived = (derivedKeys[colKey] || colKey).trim();
      if (derived) out[derived] = colKey;
    });
    return out;
  }, [selectedColumns, derivedKeys]);

  // ---- Stap 4: validatie ----
  const validate = useCallback(async () => {
    if (!dataset || !mainTableKey || !mainKeyField || !datasetKeyField) return;
    setActionError('');
    setValidating(true);
    setValidation(null);
    try {
      const result = await apiRequest(`${BASE}/validate`, {
        method: 'POST',
        body: {
          datasetTableKey: dataset.tableKey,
          datasetKeyField,
          mainTableKey,
          sourceScope,
          mainKeyField,
        },
      });
      setValidation(result);
    } catch (err) {
      setActionError(err.message || 'Validatie mislukt');
    } finally {
      setValidating(false);
    }
  }, [dataset, mainTableKey, mainKeyField, datasetKeyField, sourceScope]);

  const publish = useCallback(async () => {
    if (!dataset || !mainTableKey || !mainKeyField || !datasetKeyField) return;
    setActionError('');
    setPublishing(true);
    try {
      const result = await apiRequest(`${BASE}/publish`, {
        method: 'POST',
        body: {
          mainTableKey,
          datasetTableKey: dataset.tableKey,
          sourceScope,
          mainKeyField,
          datasetKeyField,
          fields: fieldsMap,
        },
      });
      setPublishResult(result);
      await loadReference();
    } catch (err) {
      setActionError(err.message || 'Publiceren mislukt');
    } finally {
      setPublishing(false);
    }
  }, [dataset, mainTableKey, mainKeyField, datasetKeyField, sourceScope, fieldsMap, loadReference]);

  // ---- Beheer ----
  const deleteLink = useCallback(async (id) => {
    setActionError('');
    try {
      await apiRequest(`${BASE}/links/${id}`, { method: 'DELETE' });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setActionError(err.message || 'Verwijderen mislukt');
    }
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setDataset(null);
    setUploadError('');
    setMainTableKey('');
    setSourceScope('master');
    setMainKeyField('');
    setDatasetKeyField('');
    setSelectedColumns(new Set());
    setDerivedKeys({});
    setValidation(null);
    setPublishResult(null);
    setActionError('');
  }, []);

  // Kan naar een stap genavigeerd worden? (voorwaarden per stap).
  const canGoTo = useCallback((target) => {
    if (target <= 1) return true;
    if (target === 2) return Boolean(dataset);
    if (target === 3) return Boolean(dataset && mainTableKey && mainKeyField && datasetKeyField);
    if (target === 4) return Boolean(dataset && mainTableKey && mainKeyField && datasetKeyField && selectedColumns.size > 0);
    return false;
  }, [dataset, mainTableKey, mainKeyField, datasetKeyField, selectedColumns]);

  const goToStep = useCallback((target) => {
    if (canGoTo(target)) setStep(target);
  }, [canGoTo]);

  return {
    step,
    goToStep,
    canGoTo,
    // referentie
    mainTables,
    selectedMainTable,
    scopeColumns,
    links,
    refLoading,
    refError,
    reloadReference: loadReference,
    // stap 1
    dataset,
    uploading,
    uploadError,
    uploadFile,
    // stap 2
    mainTableKey,
    setMainTableKey,
    sourceScope,
    setSourceScope,
    mainKeyField,
    setMainKeyField,
    datasetKeyField,
    setDatasetKeyField,
    // stap 3
    selectedColumns,
    derivedKeys,
    toggleColumn,
    setDerivedKey,
    fieldsMap,
    // stap 4
    validation,
    validating,
    validate,
    publishResult,
    publishing,
    publish,
    actionError,
    // beheer
    deleteLink,
    reset,
  };
}
