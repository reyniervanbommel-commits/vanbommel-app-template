import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions,
  DialogContent, DialogTrigger, Button, Checkbox, Text,
  MessageBar, MessageBarBody, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import { Shield24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

const PAGE_NAMES = [
  { id: 'home',     label: 'Hoofdpagina',     description: 'Toegang tot de hoofdpagina' },
  { id: 'supplier', label: 'Purchase orders', description: 'Inzien van inkooporders' },
  { id: 'settings', label: 'Instellingen',    description: 'Toegang tot instellingen' },
];

const useStyles = makeStyles({
  list: { display: 'flex', flexDirection: 'column', ...shorthands.gap('8px'), marginTop: '8px' },
  description: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginLeft: '28px',
    marginTop: '-4px',
  },
});

export default function EditPermissionsDialog({ user, open, onOpenChange, onSaved }) {
  const styles = useStyles();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/admin/users/${user.id}/permissions`);
      setPermissions(data.map((p) => p.page_name));
    } catch { setError('Laden van rechten mislukt'); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    if (open && user?.id) { setSuccess(false); loadPermissions(); }
  }, [open, user?.id, loadPermissions]);

  const toggle = useCallback((id) => {
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/admin/users/${user.id}/permissions`, {
        method: 'PATCH',
        body: { permissions: permissions.map((p) => ({ page_name: p })) },
      });
      setSuccess(true);
      onSaved();
      setTimeout(() => onOpenChange(false), 1000);
    } catch (err) {
      setError(err.message || 'Opslaan mislukt');
    } finally { setSaving(false); }
  }, [user?.id, permissions, onSaved, onOpenChange]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Rechten: {user.email}</DialogTitle>
          <DialogContent>
            {error && <MessageBar intent="error" style={{ marginBottom: '8px' }}><MessageBarBody>{error}</MessageBarBody></MessageBar>}
            {success && <MessageBar intent="success" style={{ marginBottom: '8px' }}><MessageBarBody>Opgeslagen</MessageBarBody></MessageBar>}
            {loading ? <Text>Laden...</Text> : (
              <div className={styles.list}>
                {PAGE_NAMES.map((page) => (
                  <div key={page.id}>
                    <Checkbox
                      label={page.label}
                      checked={permissions.includes(page.id)}
                      onChange={() => toggle(page.id)}
                    />
                    <Text className={styles.description}>{page.description}</Text>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Annuleren</Button>
            </DialogTrigger>
            <Button appearance="primary" icon={<Shield24Regular />} onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Opslaan...' : 'Rechten opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
