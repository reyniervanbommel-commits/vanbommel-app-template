import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Field,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { apiRequest } from '../../utils/api';
import {
  PO_TABLE_ZOOM_DEFAULT,
  parsePoTableZoom,
  setPoTableZoom,
} from '../../utils/poTableZoom';
import PurchaseOrderTableZoomControl from '../supplier/PurchaseOrderTableZoomControl';
import AdminInfoHint from './AdminInfoHint';

const useStyles = makeStyles({
  root: { maxWidth: '720px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  pageHeader: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
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
});

export default function AdminGeneralSettings() {
  const styles = useStyles();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const [zoom, setZoom] = useState(PO_TABLE_ZOOM_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest('/admin/settings/general')
      .then((data) => {
        if (!active) return;
        setZoom(parsePoTableZoom(data?.poTableZoom));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Failed to load settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleZoomChange = useCallback((next) => {
    setZoom(parsePoTableZoom(next));
    setFeedback('');
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFeedback('');
    setError('');
    try {
      const data = await apiRequest('/admin/settings/general', {
        method: 'PATCH',
        body: { poTableZoom: zoom },
      });
      const saved = parsePoTableZoom(data?.poTableZoom ?? zoom);
      setZoom(saved);
      setPoTableZoom(saved);
      setFeedback('Settings saved. This scale applies to all users.');
    } catch (err) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [zoom]);

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Text as="h1" size={600} weight="semibold">General</Text>
        <AdminInfoHint
          label="About general settings"
          text="Table zoom is a global scale for the purchase orders board: table, charts, RCCP and KPIs. It applies to every user."
        />
      </div>

      <div className={styles.section}>
        {loading ? (
          <Spinner size="tiny" label="Loading settings…" />
        ) : (
          <>
            <Field
              label="Table zoom"
              hint="75% to 110%, in steps of 5%. Default 85%."
            >
              <PurchaseOrderTableZoomControl
                value={zoom}
                onChange={handleZoomChange}
                disabled={!isAdmin}
              />
            </Field>
            <Text className={styles.hint}>
              {isAdmin
                ? 'Save to apply this scale for all users.'
                : 'Only an admin can change this setting.'}
            </Text>
            {isAdmin ? (
              <div className={styles.actions}>
                <Button
                  appearance="primary"
                  icon={<Save24Regular />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  Save
                </Button>
                {saving ? <Spinner size="tiny" /> : null}
              </div>
            ) : null}
            {feedback ? <Text className={styles.feedback}>{feedback}</Text> : null}
            {error ? <Text className={styles.error}>{error}</Text> : null}
          </>
        )}
      </div>
    </div>
  );
}
