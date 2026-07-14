import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Field,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import { useTrackChanges } from '../../hooks/useTrackChanges';

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
  swatch: { width: '16px', height: '16px', ...shorthands.borderRadius('3px'), flexShrink: 0 },
  swatchRed: { backgroundColor: tokens.colorPaletteRedBackground3 },
  swatchYellow: { backgroundColor: tokens.colorPaletteYellowBackground3 },
  swatchGrey: { backgroundColor: tokens.colorNeutralBackground5 },
  columnList: { display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  columnRow: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace },
});

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Medewerker' },
  { value: 'supplier', label: 'Leverancier' },
];

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('nl-NL');
}

export default function AdminTrackChangesSettings() {
  const styles = useStyles();
  const { config, loading, error, save } = useTrackChanges({ autoLoad: true });

  const [mode, setMode] = useState('session');
  const [sessionRoles, setSessionRoles] = useState(['admin', 'employee']);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setMode(config.mode);
    setSessionRoles(Array.isArray(config.sessionRoles) ? config.sessionRoles : []);
  }, [config]);

  const trackedColumns = useMemo(
    () => Object.entries(config.columns || {}).map(([id, entry]) => ({ id, activatedAt: entry.activatedAt })),
    [config.columns],
  );

  const handleModeChange = useCallback((_e, data) => {
    setMode(data.value);
    setFeedback('');
  }, []);

  const handleRoleToggle = useCallback((role) => (_e, data) => {
    setFeedback('');
    setSessionRoles((prev) => (data.checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFeedback('');
    setSaveError('');
    try {
      await save({ mode, sessionRoles, columns: config.columns || {} });
      setFeedback('Instellingen opgeslagen in SQL (dbo.app_settings).');
    } catch (err) {
      setSaveError(err.message || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }, [save, mode, sessionRoles, config.columns]);

  if (loading) return <Spinner label="Instellingen laden..." />;

  return (
    <div className={styles.root}>
      <Text size={600} weight="semibold">Track changes</Text>
      <Text className={styles.hint} block>
        Toon per kolom onderin elke cel maximaal vijf streepjes met recente wijzigingen. Zet tracking per
        kolom aan via het kolommenu op het board; hier bepaal je de granulariteit en wie een sessie start.
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

      <div className={styles.section}>
        <Text weight="semibold">Kolommen met tracking aan ({trackedColumns.length})</Text>
        {trackedColumns.length === 0 ? (
          <Text className={styles.hint}>Nog geen kolommen. Zet tracking aan via het kolommenu op het board.</Text>
        ) : (
          <div className={styles.columnList}>
            {trackedColumns.map((col) => (
              <div key={col.id} className={styles.columnRow}>
                <span className={styles.mono}>#{col.id}</span>
                <span className={styles.hint}>actief sinds {formatDate(col.activatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Opslaan...' : 'Opslaan'}
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {(saveError || error) && <Text className={styles.error}>{saveError || error}</Text>}
      </div>
    </div>
  );
}
