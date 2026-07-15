import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Save24Regular, Warning24Regular } from '@fluentui/react-icons';
import { useTrackChanges } from '../../hooks/useTrackChanges';
import { apiRequest } from '../../utils/api';
import AdminTrackChangesColumns from './AdminTrackChangesColumns';

const useStyles = makeStyles({
  root: { maxWidth: '720px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', flexWrap: 'wrap' },
  legendRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('10px') },
  swatch: { width: '12px', height: '12px', ...shorthands.borderRadius('50%'), flexShrink: 0 },
  swatchRed: { backgroundColor: tokens.colorPaletteRedBackground3 },
  swatchYellow: { backgroundColor: tokens.colorPaletteYellowBackground3 },
  swatchGrey: { backgroundColor: tokens.colorNeutralBackground5 },
  dialogWarn: { display: 'flex', alignItems: 'flex-start', ...shorthands.gap('10px') },
  warnIcon: { color: tokens.colorPaletteRedForeground1, flexShrink: 0 },
});

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Medewerker' },
  { value: 'supplier', label: 'Leverancier' },
];

const TABLE_KEY = 'purchase-orders';

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('nl-NL');
}

export default function AdminTrackChangesSettings() {
  const styles = useStyles();
  const { config, loading, error, save } = useTrackChanges({ autoLoad: true });

  const [mode, setMode] = useState('session');
  const [sessionRoles, setSessionRoles] = useState(['admin', 'employee']);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [columns, setColumns] = useState([]);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [columnsError, setColumnsError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setMode(config.mode);
    setSessionRoles(Array.isArray(config.sessionRoles) ? config.sessionRoles : []);
    setSelectedIds(new Set(Object.keys(config.columns || {})));
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setColumnsLoading(true);
      setColumnsError('');
      try {
        const data = await apiRequest(`/data/${TABLE_KEY}/columns`);
        const list = (data.columns || [])
          .filter((c) => c.id != null && (c.source === 'custom' || c.source === 'd365'))
          .map((c) => ({ id: c.id, label: c.label, source: c.source, scope: c.scope }));
        if (!cancelled) setColumns(list);
      } catch (err) {
        if (!cancelled) setColumnsError(err.message || 'Kon kolommen niet laden');
      } finally {
        if (!cancelled) setColumnsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trackedSince = useMemo(() => {
    const map = {};
    for (const [id, entry] of Object.entries(config.columns || {})) map[id] = entry.activatedAt;
    return map;
  }, [config.columns]);

  const handleModeChange = useCallback((_e, data) => {
    setMode(data.value);
    setFeedback('');
  }, []);

  const handleRoleToggle = useCallback((role) => (_e, data) => {
    setFeedback('');
    setSessionRoles((prev) => (data.checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)));
  }, []);

  const handleColumnToggle = useCallback((id, checked) => {
    setFeedback('');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const doSave = useCallback(async (reset) => {
    setSaving(true);
    setFeedback('');
    setSaveError('');
    setConfirmOpen(false);
    try {
      const nowIso = new Date().toISOString();
      const columnsMap = {};
      for (const id of selectedIds) {
        columnsMap[id] = { activatedAt: reset ? nowIso : (config.columns?.[id]?.activatedAt || nowIso) };
      }
      await save({ mode, sessionRoles, columns: columnsMap });
      setFeedback(reset
        ? 'Opgeslagen. Alle track changes zijn op 0 gezet; tracking start opnieuw.'
        : 'Instellingen opgeslagen in SQL (dbo.app_settings).');
    } catch (err) {
      setSaveError(err.message || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }, [selectedIds, config.columns, save, mode, sessionRoles]);

  const handleSaveClick = useCallback(() => {
    const prevIds = Object.keys(config.columns || {});
    const hasAdditions = [...selectedIds].some((id) => !prevIds.includes(id));
    const modeChanged = mode !== config.mode;
    if (hasAdditions || modeChanged) setConfirmOpen(true);
    else doSave(false);
  }, [config.columns, config.mode, selectedIds, mode, doSave]);

  if (loading) return <Spinner label="Instellingen laden..." />;

  return (
    <div className={styles.root}>
      <Text size={600} weight="semibold">Track changes</Text>
      <Text className={styles.hint} block>
        Kies hier centraal welke kolommen getrackt worden en de granulariteit. Onderin elke cel verschijnen
        maximaal acht stippen met recente wijzigingen. Een kolom aanzetten of de granulariteit wijzigen zet
        alle track changes op 0 en start opnieuw; een kolom uitzetten kan zonder reset.
      </Text>

      <div className={styles.section}>
        <Field label="Granulariteit">
          <RadioGroup value={mode} onChange={handleModeChange} layout="horizontal">
            <Radio value="session" label="Per sessie" />
            <Radio value="week" label="Per week (ma–zo)" />
          </RadioGroup>
        </Field>
        <Text className={styles.hint} block>
          Per sessie: een nieuw venster start bij een login van een geselecteerde rol. Per week: elke
          ISO-week (maandag–zondag) is een venster; er is dan geen sessie-registratie nodig.
        </Text>
      </div>

      {mode === 'session' && (
        <div className={styles.section}>
          <Field label="Welke rollen starten een sessie?">
            <div>
              {ROLE_OPTIONS.map((role) => (
                <Checkbox
                  key={role.value}
                  label={role.label}
                  checked={sessionRoles.includes(role.value)}
                  onChange={handleRoleToggle(role.value)}
                />
              ))}
            </div>
          </Field>
          <Text className={styles.hint} block>
            Alleen een login van een geselecteerde rol maakt een nieuwe sessie aan. Beperk dit tot intern
            personeel zodat een sessie een betekenisvol venster blijft.
          </Text>
        </div>
      )}

      <div className={styles.section}>
        <Text weight="semibold">Kolommen met tracking ({selectedIds.size})</Text>
        <AdminTrackChangesColumns
          columns={columns}
          selectedIds={selectedIds}
          trackedSince={trackedSince}
          loading={columnsLoading}
          onToggle={handleColumnToggle}
          formatDate={formatDate}
        />
        {columnsError && <Text className={styles.error}>{columnsError}</Text>}
      </div>

      <div className={styles.section}>
        <Text weight="semibold">Legenda</Text>
        <div className={styles.legendRow}>
          <span className={`${styles.swatch} ${styles.swatchRed}`} aria-hidden />
          <Text>Rood — gewijzigd in die sessie/week</Text>
        </div>
        <div className={styles.legendRow}>
          <span className={`${styles.swatch} ${styles.swatchYellow}`} aria-hidden />
          <Text>Geel — afgeronde sessie/week zonder wijziging</Text>
        </div>
        <div className={styles.legendRow}>
          <span className={`${styles.swatch} ${styles.swatchGrey}`} aria-hidden />
          <Text>Grijs — lopende/toekomstige sessie/week of vóór activatie</Text>
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSaveClick} disabled={saving}>
          {saving ? 'Opslaan...' : 'Opslaan'}
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {(saveError || error) && <Text className={styles.error}>{saveError || error}</Text>}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(_e, data) => setConfirmOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Track changes opnieuw starten?</DialogTitle>
            <DialogContent>
              <div className={styles.dialogWarn}>
                <Warning24Regular className={styles.warnIcon} />
                <Text>
                  Je zet een kolom aan of wijzigt de granulariteit. Hierdoor worden <b>alle</b> track-changes
                  stippen op 0 gezet en start het tracken voor alle kolommen opnieuw. Doorgaan?
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)}>Annuleren</Button>
              <Button appearance="primary" onClick={() => doSave(true)}>Ja, opnieuw starten</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
